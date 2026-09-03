import { randomUUID } from "crypto";
import { planTask } from "./planner";
import { authorizeTool } from "./policy";
import { getTool } from "./tools";
import { runModel } from "@/lib/ai/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withRetry, withTimeout } from "./reliability";
import type { AgentDefinition, TaskInput, TaskResult } from "./types";

export async function executeTask(input: TaskInput, agent: AgentDefinition, userId: string, options?: { taskId?: string; resume?: boolean; signal?: AbortSignal }): Promise<TaskResult> {
  const supabase = await createSupabaseServerClient();
  const taskId = options?.taskId ?? randomUUID();
  const budget = input.budgetCents ?? agent.budgetCents;
  let steps = planTask(taskId, input.goal, agent);
  const usage = { inputTokens: 0, outputTokens: 0, costCents: 0 };
  let approvedResume = false;

  if (!options?.resume) {
    const { error } = await supabase.from("tasks").insert({ id: taskId, organization_id: input.organizationId, agent_id: agent.id, created_by: userId, goal: input.goal.trim(), status: "pending", metadata: input.metadata ?? {}, budget_cents: budget, idempotency_key: input.idempotencyKey ?? null });
    if (error) {
      if (input.idempotencyKey && error.code === "23505") {
        const { data: existing, error: lookupError } = await supabase.from("tasks").select("id,status,output,error").eq("organization_id", input.organizationId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
        if (lookupError || !existing) throw new Error(`Could not create task: ${error.message}`);
        const { data: existingSteps } = await supabase.from("task_steps").select("id,task_id,step_index,name,status,input,output,error").eq("task_id", existing.id).order("step_index");
        return { taskId: existing.id, status: existing.status, output: existing.output, steps: (existingSteps ?? []).map((s) => ({ id: s.id, taskId: s.task_id, order: s.step_index, name: s.name, status: s.status, input: s.input, output: s.output, error: s.error })), usage };
      }
      throw new Error(`Could not create task: ${error.message}`);
    }
    const rows = steps.map((s) => ({ id: randomUUID(), task_id: taskId, step_index: s.order, name: s.name, status: "pending", input: s.input ?? null }));
    const { error: stepError } = await supabase.from("task_steps").insert(rows);
    if (stepError) throw new Error(`Could not create task steps: ${stepError.message}`);
  } else {
    const { data: dbSteps, error } = await supabase.from("task_steps").select("id,task_id,step_index,name,status,input,output,error").eq("task_id", taskId).order("step_index");
    if (error) throw new Error(`Could not load task steps: ${error.message}`);
    steps = (dbSteps ?? []).map((s) => ({ id: s.id, taskId: s.task_id, order: s.step_index, name: s.name, status: s.status, input: s.input, output: s.output, error: s.error }));
    const { data: approvedApproval } = await supabase.from("approvals").select("id").eq("task_id", taskId).eq("organization_id", input.organizationId).eq("status", "approved").order("decided_at", { ascending: false }).limit(1).maybeSingle();
    approvedResume = Boolean(approvedApproval);
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_task", { p_task_id: taskId, p_attempt: 1 });
  if (claimError || claimed !== true) {
    const { data: current } = await supabase.from("tasks").select("status,output,error").eq("id", taskId).eq("organization_id", input.organizationId).maybeSingle();
    if (current?.status === "completed") return { taskId, status: "completed", output: current.output, steps, usage };
    if (current?.status === "waiting_approval") return { taskId, status: "waiting_approval", steps, usage };
    throw new Error(`Task ${taskId} could not be claimed`);
  }

  const persistStep = async (index: number, status: string, output?: unknown, error?: string) => {
    const { error: persistError } = await supabase.from("task_steps").update({ status, output: output ?? null, error: error ?? null, started_at: status === "running" ? new Date().toISOString() : undefined, completed_at: ["completed", "failed"].includes(status) ? new Date().toISOString() : null }).eq("task_id", taskId).eq("step_index", index);
    if (persistError) throw new Error(`Could not persist step ${index}: ${persistError.message}`);
  };
  const isCancelled = async () => {
    if (options?.signal?.aborted) return true;
    const { data } = await supabase.from("tasks").select("cancel_requested").eq("id", taskId).eq("organization_id", input.organizationId).maybeSingle();
    return Boolean(data?.cancel_requested);
  };

  try {
    for (const step of steps) {
      if (step.status === "completed") continue;
      if (await isCancelled()) throw new Error("Task cancelled");

      const { data: stepClaimed, error: stepClaimError } = await supabase.rpc("claim_task_step", { p_task_id: taskId, p_step_index: step.order });
      if (stepClaimError) throw new Error(`Could not claim step ${step.order}: ${stepClaimError.message}`);
      if (stepClaimed !== true) {
        const { data: currentStep } = await supabase.from("task_steps").select("status,output,error").eq("task_id", taskId).eq("step_index", step.order).maybeSingle();
        if (currentStep?.status === "completed") {
          step.status = "completed";
          step.output = currentStep.output;
          step.error = currentStep.error;
          continue;
        }
        if (currentStep?.status === "waiting_approval") return { taskId, status: "waiting_approval", steps, usage };
        throw new Error(`Step ${step.order} is already being executed`);
      }

      const executeStep = async () => {
        if (step.order === 1) return { understood: true, goal: input.goal };
        if (step.order === 2) return { tools: agent.tools, model: agent.model };
        if (step.order === 3) {
          const toolName = agent.tools[0];
          if (toolName) {
            const tool = getTool(toolName);
            if (!tool) throw new Error(`Unknown tool: ${toolName}`);
            const decision = authorizeTool({ ...agent, budgetCents: budget }, tool, usage.costCents);
            if (decision.requiresApproval && !approvedResume) {
              await persistStep(3, "waiting_approval", { requiresApproval: true, reason: decision.reason, tool: tool.name });
              const { data: existingApproval } = await supabase.from("approvals").select("id").eq("task_id", taskId).eq("organization_id", input.organizationId).eq("status", "pending").maybeSingle();
              if (!existingApproval) {
                await supabase.from("approvals").insert({ organization_id: input.organizationId, task_id: taskId, requested_by: userId, status: "pending", action: `tool:${tool.name}`, reason: decision.reason ?? "Approval required", payload: { goal: input.goal, tool: tool.name } });
              }
              await supabase.from("tasks").update({ status: "waiting_approval" }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
              return { __approval: true };
            }
            if (!decision.allowed) throw new Error(decision.reason ?? "Tool execution denied");
            return tool.execute({ goal: input.goal }, { organizationId: input.organizationId, agentId: agent.id, taskId });
          }
          const result = await runModel({ model: agent.model, system: agent.instructions, prompt: input.goal });
          usage.inputTokens += result.usage.inputTokens;
          usage.outputTokens += result.usage.outputTokens;
          return { text: result.text, usage: result.usage };
        }
        return { validated: true };
      };

      const result = await withRetry(
        (_attempt, signal) => withTimeout(() => executeStep(), (step.order === 3 ? 300 : 60) * 1000, signal),
        { maxAttempts: step.order === 3 ? 3 : 2, baseDelayMs: 500, signal: options?.signal }
      );
      if (typeof result === "object" && result && "__approval" in result) return { taskId, status: "waiting_approval", steps, usage };
      step.status = "completed";
      step.output = result;
      await persistStep(step.order, "completed", result);
    }

    if (await isCancelled()) throw new Error("Task cancelled");
    await supabase.from("tasks").update({ status: "completed", output: steps.at(-1)?.output ?? null, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cost_cents: usage.costCents, completed_at: new Date().toISOString() }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
    return { taskId, status: "completed", output: steps.at(-1)?.output, steps, usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task execution failed";
    const cancelled = message === "Task cancelled" || options?.signal?.aborted;
    await supabase.from("tasks").update({ status: cancelled ? "cancelled" : "failed", error: message, completed_at: new Date().toISOString() }).eq("id", taskId).eq("organization_id", input.organizationId).eq("status", "running");
    return { taskId, status: cancelled ? "cancelled" : "failed", steps, usage };
  }
}
