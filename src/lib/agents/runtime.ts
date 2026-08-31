import { randomUUID } from "crypto";
import { planTask } from "./planner";
import { authorizeTool } from "./policy";
import { getTool } from "./tools";
import type { AgentDefinition, TaskInput, TaskResult } from "./types";

export async function executeTask(input: TaskInput, agent: AgentDefinition): Promise<TaskResult> {
  const taskId = randomUUID();
  const steps = planTask(taskId, input.goal, agent);
  const usage = { inputTokens: 0, outputTokens: 0, costCents: 0 };

  steps[0].status = "completed";
  steps[0].output = { understood: true, goal: input.goal };
  steps[1].status = "completed";
  steps[1].output = { tools: agent.tools };

  const toolName = agent.tools[0];
  if (!toolName) {
    steps[2].status = "completed";
    steps[2].output = { message: "No external tool configured; task is ready for model execution." };
  } else {
    const tool = getTool(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const decision = authorizeTool(agent, tool, usage.costCents);
    if (decision.requiresApproval) {
      steps[2].status = "waiting_approval";
      return { taskId, status: "waiting_approval", steps, usage };
    }
    if (!decision.allowed) {
      steps[2].status = "failed";
      steps[2].error = decision.reason;
      return { taskId, status: "failed", steps, usage };
    }
    steps[2].status = "running";
    steps[2].output = await tool.execute({ goal: input.goal }, { organizationId: input.organizationId, agentId: agent.id, taskId });
    steps[2].status = "completed";
  }

  steps[3].status = "completed";
  steps[3].output = { validated: true };
  return { taskId, status: "completed", output: steps[2].output, steps, usage };
}
