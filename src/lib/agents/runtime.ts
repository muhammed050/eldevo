import { randomUUID } from "crypto";
import { planTask } from "./planner";
import { authorizeTool } from "./policy";
import { getTool } from "./tools";
import { runModel } from "@/lib/ai/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AgentDefinition, TaskInput, TaskResult } from "./types";

export async function executeTask(input: TaskInput, agent: AgentDefinition, userId: string): Promise<TaskResult> {
  const supabase = await createSupabaseServerClient();
  const taskId = randomUUID();
  const steps = planTask(taskId, input.goal, agent);
  const usage = { inputTokens: 0, outputTokens: 0, costCents: 0 };
  const budget = input.budgetCents ?? agent.budgetCents;

  const { error: taskInsertError } = await supabase.from("tasks").insert({
    id: taskId,
    organization_id: input.organizationId,
    agent_id: agent.id,
    created_by: userId,
    goal: input.goal.trim(),
    status: "running",
    metadata: input.metadata ?? {},
    budget_cents: budget,
    started_at: new Date().toISOString(),
  });
  if (taskInsertError) throw new Error(`Could not create task: ${taskInsertError.message}`);

  const stepRows = steps.map((step) => ({
    id: randomUUID(),
    task_id: taskId,
    step_index: step.order,
    name: step.name,
    status: "pending",
    input: step.input ?? null,
  }));
  const { error: stepsError } = await supabase.from("task_steps").insert(stepRows);
  if (stepsError) throw new Error(`Could not create task steps: ${stepsError.message}`);

  const persistStep = async (index: number, status: string, output?: unknown, error?: string) => {
    await supabase.from("task_steps").update({
      status,
      output: output ?? null,
      error: error ?? null,
      completed_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
    }).eq("task_id", taskId).eq("step_index", index);
  };

  try {
    steps[0].status = "completed";
    steps[0].output = { understood: true, goal: input.goal };
    await persistStep(1, "completed", steps[0].output);

    steps[1].status = "completed";
    steps[1].output = { tools: agent.tools, model: agent.model };
    await persistStep(2, "completed", steps[1].output);

    const toolName = agent.tools[0];
    let output: unknown;

    if (toolName) {
      const tool = getTool(toolName);
      if (!tool) throw new Error(`Unknown tool: ${toolName}`);
      const decision = authorizeTool({ ...agent, budgetCents: budget }, tool, usage.costCents);
      if (decision.requiresApproval) {
        await persistStep(3, "waiting_approval", { requiresApproval: true, reason: decision.reason, tool: tool.name });
        await supabase.from("approvals").insert({
          organization_id: input.organizationId,
          task_id: taskId,
          requested_by: userId,
          status: "pending",
          action: `tool:${tool.name}`,
          reason: decision.reason ?? "Approval required",
          payload: { goal: input.goal, tool: tool.name },
        });
        await supabase.from("tasks").update({ status: "waiting_approval" }).eq("id", taskId);
        return { taskId, status: "waiting_approval", steps, usage };
      }
      if (!decision.allowed) throw new Error(decision.reason ?? "Tool execution denied");
      await persistStep(3, "running");
      output = await tool.execute({ goal: input.goal }, { organizationId: input.organizationId, agentId: agent.id, taskId });
    } else {
      await persistStep(3, "running");
      const result = await runModel({ model: agent.model, system: agent.instructions, prompt: input.goal });
      usage.inputTokens = result.usage.inputTokens;
      usage.outputTokens = result.usage.outputTokens;
      output = { text: result.text, usage: result.usage };
    }

    steps[2].status = "completed";
    steps[2].output = output;
    await persistStep(3, "completed", output);
    steps[3].status = "completed";
    steps[3].output = { validated: true };
    await persistStep(4, "completed", steps[3].output);

    await supabase.from("tasks").update({
      status: "completed",
      output,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_cents: usage.costCents,
      completed_at: new Date().toISOString(),
    }).eq("id", taskId);

    return { taskId, status: "completed", output, steps, usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task execution failed";
    const runningStep = steps.find((step) => step.status === "running") ?? steps[2];
    runningStep.status = "failed";
    runningStep.error = message;
    await persistStep(runningStep.order, "failed", undefined, message);
    await supabase.from("tasks").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", taskId);
    return { taskId, status: "failed", steps, usage };
  }
}
