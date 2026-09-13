import { randomUUID } from "crypto";
import { planTask } from "./planner";
import { authorizeTool } from "./policy";
import { getTool } from "./tools";
import { runModel } from "@/lib/ai/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapConcurrent, withRetry, withTimeout } from "./reliability";
import { classifyRuntimeError, RuntimeError } from "./errors";
import { addUsage, calculateCostCents, parseModel } from "./usage";
import type { AgentDefinition, TaskInput, TaskResult, TaskStep } from "./types";

type RuntimeOptions = { taskId?: string; resume?: boolean; enqueue?: boolean; serviceRole?: boolean; approvalId?: string; signal?: AbortSignal };
type ModelExecutionResult = {
  text: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  __usage: { provider: string; model: string; inputTokens: number; outputTokens: number; costCents: number; latencyMs: number };
};

type ParallelStepMetadata = { parallelSafe?: boolean; parallelGroup?: string };

function isModelExecutionResult(value: unknown): value is ModelExecutionResult {
  return Boolean(value && typeof value === "object" && "__usage" in value);
}

function getParallelStepMetadata(step: TaskStep): ParallelStepMetadata | undefined {
  if (!step.input || typeof step.input !== "object" || Array.isArray(step.input)) return undefined;
  const input = step.input as Record<string, unknown>;
  return {
    parallelSafe: input.parallelSafe === true,
    parallelGroup: typeof input.parallelGroup === "string" ? input.parallelGroup : undefined,
  };
}

function getParallelGroups(steps: TaskStep[]) {
  const groups = new Map<string, TaskStep[]>();
  for (const step of steps) {
    if (step.status === "completed") continue;
    const metadata = getParallelStepMetadata(step);
    if (!metadata?.parallelSafe || !metadata.parallelGroup) continue;
    const existing = groups.get(metadata.parallelGroup) ?? [];
    existing.push(step);
    groups.set(metadata.parallelGroup, existing);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export async function executeTask(input: TaskInput, agent: AgentDefinition, userId: string, options?: RuntimeOptions): Promise<TaskResult> {
  const supabase = options?.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
  const taskId = options?.taskId ?? randomUUID();
  const budget = input.budgetCents ?? agent.budgetCents;
  let steps = planTask(taskId, input.goal, agent);
  const usage = { inputTokens: 0, outputTokens: 0, costCents: 0 };
  let approvedResume = false;
  let activeStepOrder: number | undefined;
  let activeAttempt = 1;

  const trace = async (stepIndex: number, eventType: string, metadata: Record<string, unknown> = {}, attempt = activeAttempt) => {
    const { error } = await supabase.rpc("record_task_step_trace", { p_task_id: taskId, p_step_index: stepIndex, p_event_type: eventType, p_attempt: attempt, p_metadata: metadata });
    if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not persist step trace: ${error.message}`, { retryable: true, cause: error });
  };

  if (!options?.resume) {
    const { error } = await supabase.from("tasks").insert({ id: taskId, organization_id: input.organizationId, agent_id: agent.id, created_by: userId, goal: input.goal.trim(), status: "pending", metadata: input.metadata ?? {}, budget_cents: budget, idempotency_key: input.idempotencyKey ?? null });
    if (error) {
      if (input.idempotencyKey && error.code === "23505") {
        const { data: existing, error: lookupError } = await supabase.from("tasks").select("id,status,output,error").eq("organization_id", input.organizationId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
        if (lookupError || !existing) throw new RuntimeError("TASK_PERSISTENCE_FAILED", `Could not create task: ${error.message}`, { cause: error });
        const { data: existingSteps } = await supabase.from("task_steps").select("id,task_id,step_index,name,status,input,output,error").eq("task_id", existing.id).order("step_index");
        return { taskId: existing.id, status: existing.status, output: existing.output, steps: (existingSteps ?? []).map((s) => ({ id: s.id, taskId: s.task_id, order: s.step_index, name: s.name, status: s.status, input: s.input, output: s.output, error: s.error })), usage };
      }
      throw new RuntimeError("TASK_PERSISTENCE_FAILED", `Could not create task: ${error.message}`, { cause: error });
    }
    const rows = steps.map((s) => ({ id: randomUUID(), task_id: taskId, step_index: s.order, name: s.name, status: "pending", input: s.input ?? null }));
    const { error: stepError } = await supabase.from("task_steps").insert(rows);
    if (stepError) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not create task steps: ${stepError.message}`, { cause: stepError });
    steps = steps.map((step, index) => ({ ...step, id: rows[index].id }));
    if (options?.enqueue) {
      const { error: queueError } = await supabase.rpc("enqueue_task", { p_task_id: taskId, p_organization_id: input.organizationId });
      if (queueError) throw new RuntimeError("QUEUE_FAILURE", `Could not enqueue task: ${queueError.message}`, { retryable: true, cause: queueError });
      return { taskId, status: "pending", steps, usage };
    }
  } else {
    const { data: dbSteps, error } = await supabase.from("task_steps").select("id,task_id,step_index,name,status,input,output,error").eq("task_id", taskId).order("step_index");
    if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load task steps: ${error.message}`, { retryable: true, cause: error });
    steps = (dbSteps ?? []).map((s) => ({ id: s.id, taskId: s.task_id, order: s.step_index, name: s.name, status: s.status, input: s.input, output: s.output, error: s.error }));
    if (options?.approvalId) {
      const { data: approvedApproval } = await supabase.from("approvals").select("id").eq("id", options.approvalId).eq("task_id", taskId).eq("organization_id", input.organizationId).eq("status", "approved").maybeSingle();
      approvedResume = Boolean(approvedApproval);
    }
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_task", { p_task_id: taskId, p_attempt: 1 });
  if (claimError || claimed !== true) {
    const { data: current } = await supabase.from("tasks").select("status,output,error").eq("id", taskId).eq("organization_id", input.organizationId).maybeSingle();
    if (current?.status === "completed") return { taskId, status: "completed", output: current.output, steps, usage };
    if (current?.status === "waiting_approval") return { taskId, status: "waiting_approval", steps, usage };
    throw new RuntimeError("TASK_CLAIM_FAILED", `Task ${taskId} could not be claimed`, { retryable: true, cause: claimError });
  }

  const persistStep = async (index: number, status: string, output?: unknown, error?: string) => {
    const { error: persistError } = await supabase.from("task_steps").update({ status, output: output ?? null, error: error ?? null, started_at: status === "running" ? new Date().toISOString() : undefined, completed_at: ["completed", "failed", "cancelled"].includes(status) ? new Date().toISOString() : null }).eq("task_id", taskId).eq("step_index", index);
    if (persistError) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not persist step ${index}: ${persistError.message}`, { retryable: true, cause: persistError });
  };

  const isCancelled = async () => {
    if (options?.signal?.aborted) return true;
    const { data } = await supabase.from("tasks").select("cancel_requested").eq("id", taskId).eq("organization_id", input.organizationId).maybeSingle();
    return Boolean(data?.cancel_requested);
  };

  const executeParallelSafeStep = async (step: TaskStep) => {
    let attempt = 1;
    try {
      if (await isCancelled()) throw new RuntimeError("TASK_CANCELLED", "Task cancelled");
      await trace(step.order, "started", { name: step.name, parallel: true }, attempt);
      const { data: stepClaimed, error: stepClaimError } = await supabase.rpc("claim_task_step", { p_task_id: taskId, p_step_index: step.order });
      if (stepClaimError) throw new RuntimeError("STEP_CLAIM_FAILED", `Could not claim step ${step.order}: ${stepClaimError.message}`, { retryable: true, cause: stepClaimError });
      if (stepClaimed !== true) {
        const { data: currentStep } = await supabase.from("task_steps").select("status,output,error").eq("task_id", taskId).eq("step_index", step.order).maybeSingle();
        if (currentStep?.status === "completed") {
          step.status = "completed";
          step.output = currentStep.output;
          step.error = currentStep.error;
          return;
        }
        throw new RuntimeError("STEP_CLAIM_FAILED", `Step ${step.order} is already being executed`, { retryable: true });
      }

      const result = await withRetry(async (currentAttempt, signal) => {
        attempt = currentAttempt;
        return withTimeout(async () => {
          if (step.order === 1) return { understood: true, goal: input.goal };
          if (step.order === 2) return { tools: agent.tools, model: agent.model };
          throw new RuntimeError("UNKNOWN_RUNTIME_ERROR", `Step ${step.order} was marked parallel-safe without a safe executor`);
        }, 60_000, signal);
      }, { maxAttempts: 2, baseDelayMs: 500, signal: options?.signal });

      step.status = "completed";
      step.output = result;
      await persistStep(step.order, "completed", result);
      await trace(step.order, "completed", { name: step.name, parallel: true }, attempt);
    } catch (error) {
      const runtimeError = error instanceof RuntimeError ? error : classifyRuntimeError(error);
      const cancelled = runtimeError.code === "TASK_CANCELLED" || options?.signal?.aborted;
      await persistStep(step.order, cancelled ? "cancelled" : "failed", undefined, runtimeError.message);
      await supabase.from("task_steps").update({ error_code: runtimeError.code, error_retryable: runtimeError.retryable }).eq("task_id", taskId).eq("step_index", step.order);
      await trace(step.order, cancelled ? "cancelled" : "failed", { error: runtimeError.message, code: runtimeError.code, retryable: runtimeError.retryable, parallel: true }, attempt);
      throw runtimeError;
    }
  };

  try {
    for (const parallelGroup of getParallelGroups(steps)) {
      await mapConcurrent(parallelGroup, executeParallelSafeStep, Math.min(4, parallelGroup.length));
    }

    for (const step of steps) {
      if (step.status === "completed") continue;
      if (await isCancelled()) throw new RuntimeError("TASK_CANCELLED", "Task cancelled");
      activeStepOrder = step.order;
      activeAttempt = 1;
      await trace(step.order, "started", { name: step.name });
      const { data: stepClaimed, error: stepClaimError } = await supabase.rpc("claim_task_step", { p_task_id: taskId, p_step_index: step.order });
      if (stepClaimError) throw new RuntimeError("STEP_CLAIM_FAILED", `Could not claim step ${step.order}: ${stepClaimError.message}`, { retryable: true, cause: stepClaimError });
      if (stepClaimed !== true) {
        const { data: currentStep } = await supabase.from("task_steps").select("status,output,error").eq("task_id", taskId).eq("step_index", step.order).maybeSingle();
        if (currentStep?.status === "completed") { step.status = "completed"; step.output = currentStep.output; step.error = currentStep.error; continue; }
        if (currentStep?.status === "waiting_approval") return { taskId, status: "waiting_approval", steps, usage };
        throw new RuntimeError("STEP_CLAIM_FAILED", `Step ${step.order} is already being executed`, { retryable: true });
      }

      const executeStep = async () => {
        if (step.order === 1) return { understood: true, goal: input.goal };
        if (step.order === 2) return { tools: agent.tools, model: agent.model };
        if (step.order === 3) {
          const toolName = agent.tools[0];
          if (toolName) {
            const tool = getTool(toolName);
            if (!tool) throw new RuntimeError("TOOL_NOT_FOUND", `Unknown tool: ${toolName}`);
            const decision = authorizeTool({ ...agent, budgetCents: budget }, tool, usage.costCents);
            if (decision.requiresApproval && !approvedResume) {
              await persistStep(3, "waiting_approval", { requiresApproval: true, reason: decision.reason, tool: tool.name });
              await trace(3, "waiting_approval", { reason: decision.reason, tool: tool.name });
              const { data: existingApproval } = await supabase.from("approvals").select("id").eq("task_id", taskId).eq("organization_id", input.organizationId).eq("status", "pending").maybeSingle();
              if (!existingApproval) {
                const { error: approvalError } = await supabase.from("approvals").insert({ organization_id: input.organizationId, task_id: taskId, requested_by: userId, status: "pending", action: `tool:${tool.name}`, reason: decision.reason ?? "Approval required", payload: { goal: input.goal, tool: tool.name } });
                if (approvalError) throw new RuntimeError("APPROVAL_PERSISTENCE_FAILED", `Could not create approval: ${approvalError.message}`, { retryable: true, cause: approvalError });
              }
              const { error: taskError } = await supabase.from("tasks").update({ status: "waiting_approval" }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
              if (taskError) throw new RuntimeError("TASK_PERSISTENCE_FAILED", `Could not pause task: ${taskError.message}`, { cause: taskError });
              return { __approval: true };
            }
            if (!decision.allowed) throw new RuntimeError("TOOL_DENIED", decision.reason ?? "Tool execution denied");
            return tool.execute({ goal: input.goal }, { organizationId: input.organizationId, agentId: agent.id, taskId });
          }
          try {
            const startedAt = Date.now();
            const result = await runModel({ model: agent.model, system: agent.instructions, prompt: input.goal });
            const { provider, name } = parseModel(agent.model);
            return {
              text: result.text,
              usage: result.usage,
              __usage: {
                provider,
                model: name,
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                costCents: calculateCostCents(agent.model, result.usage.inputTokens, result.usage.outputTokens),
                latencyMs: Date.now() - startedAt,
              },
            } satisfies ModelExecutionResult;
          } catch (error) {
            throw new RuntimeError("MODEL_FAILURE", "Model execution failed", { retryable: true, cause: error });
          }
        }
        return { validated: true };
      };

      const result = await withRetry((_attempt, signal) => { activeAttempt = _attempt; return withTimeout(() => executeStep(), (step.order === 3 ? 300 : 60) * 1000, signal); }, { maxAttempts: step.order === 3 ? 3 : 2, baseDelayMs: 500, signal: options?.signal });
      if (typeof result === "object" && result && "__approval" in result) return { taskId, status: "waiting_approval", steps, usage };

      let persistedResult: unknown = result;
      if (isModelExecutionResult(result)) {
        const modelUsage = result.__usage;
        const accountingClient = createSupabaseServiceClient();
        const { error: usageError } = await accountingClient.rpc("record_task_step_usage", {
          p_task_id: taskId,
          p_task_step_id: step.id,
          p_organization_id: input.organizationId,
          p_provider: modelUsage.provider,
          p_model: modelUsage.model,
          p_attempt: activeAttempt,
          p_input_tokens: modelUsage.inputTokens,
          p_output_tokens: modelUsage.outputTokens,
          p_cost_cents: modelUsage.costCents,
          p_latency_ms: modelUsage.latencyMs,
        });
        if (usageError) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not persist step usage: ${usageError.message}`, { retryable: true, cause: usageError });
        addUsage(usage, modelUsage.inputTokens, modelUsage.outputTokens, modelUsage.costCents);
        persistedResult = { text: result.text, usage: result.usage };
      }

      step.status = "completed";
      step.output = persistedResult;
      await persistStep(step.order, "completed", persistedResult);
      await trace(step.order, "completed", { name: step.name });
      activeStepOrder = undefined;
    }

    if (await isCancelled()) throw new RuntimeError("TASK_CANCELLED", "Task cancelled");
    const { error: taskCompleteError } = await supabase.from("tasks").update({ status: "completed", output: steps.at(-1)?.output ?? null, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cost_cents: usage.costCents, completed_at: new Date().toISOString(), error_code: null, error_retryable: false }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
    if (taskCompleteError) throw new RuntimeError("TASK_PERSISTENCE_FAILED", `Could not complete task: ${taskCompleteError.message}`, { retryable: true, cause: taskCompleteError });
    return { taskId, status: "completed", output: steps.at(-1)?.output, steps, usage };
  } catch (error) {
    const runtimeError = error instanceof RuntimeError ? error : classifyRuntimeError(error);
    const cancelled = runtimeError.code === "TASK_CANCELLED" || options?.signal?.aborted;
    if (activeStepOrder !== undefined) {
      await persistStep(activeStepOrder, cancelled ? "cancelled" : "failed", undefined, runtimeError.message);
      await supabase.from("task_steps").update({ error_code: runtimeError.code, error_retryable: runtimeError.retryable }).eq("task_id", taskId).eq("step_index", activeStepOrder);
      await trace(activeStepOrder, cancelled ? "cancelled" : "failed", { error: runtimeError.message, code: runtimeError.code, retryable: runtimeError.retryable });
    }
    await supabase.from("tasks").update({ status: cancelled ? "cancelled" : "failed", error: runtimeError.message, error_code: runtimeError.code, error_retryable: runtimeError.retryable, completed_at: new Date().toISOString() }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
    return { taskId, status: cancelled ? "cancelled" : "failed", steps, usage };
  }
}
