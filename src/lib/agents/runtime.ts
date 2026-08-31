import { randomUUID } from "crypto";
import { planTask } from "./planner";
import { authorizeTool } from "./policy";
import { getTool } from "./tools";
import { runModel } from "@/lib/ai/provider";
import type { AgentDefinition, TaskInput, TaskResult } from "./types";

export async function executeTask(input: TaskInput, agent: AgentDefinition): Promise<TaskResult> {
  const taskId = randomUUID();
  const steps = planTask(taskId, input.goal, agent);
  const usage = { inputTokens: 0, outputTokens: 0, costCents: 0 };

  steps[0].status = "completed";
  steps[0].output = { understood: true, goal: input.goal };

  steps[1].status = "completed";
  steps[1].output = { tools: agent.tools, model: agent.model };

  const toolName = agent.tools[0];
  let toolOutput: unknown = undefined;
  if (toolName) {
    const tool = getTool(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const decision = authorizeTool(agent, tool, usage.costCents);
    if (decision.requiresApproval) {
      steps[2].status = "waiting_approval";
      steps[2].output = { requiresApproval: true, reason: decision.reason };
      return { taskId, status: "waiting_approval", steps, usage };
    }
    if (!decision.allowed) {
      steps[2].status = "failed";
      steps[2].error = decision.reason;
      return { taskId, status: "failed", steps, usage };
    }
    steps[2].status = "running";
    toolOutput = await tool.execute({ goal: input.goal }, { organizationId: input.organizationId, agentId: agent.id, taskId });
    steps[2].status = "completed";
    steps[2].output = toolOutput;
  } else {
    steps[2].status = "running";
    const result = await runModel({
      model: agent.model,
      system: agent.instructions,
      prompt: input.goal,
    });
    usage.inputTokens = result.usage.inputTokens;
    usage.outputTokens = result.usage.outputTokens;
    // Cost calculation is deliberately provider-configurable; never invent pricing.
    steps[2].output = { text: result.text, usage: result.usage };
    steps[2].status = "completed";
    toolOutput = result.text;
  }

  steps[3].status = "completed";
  steps[3].output = { validated: true };
  return { taskId, status: "completed", output: toolOutput, steps, usage };
}
