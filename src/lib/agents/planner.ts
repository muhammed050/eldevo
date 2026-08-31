import type { AgentDefinition, TaskStep } from "./types";

export function planTask(taskId: string, goal: string, agent: AgentDefinition): TaskStep[] {
  const normalized = goal.trim();
  if (!normalized) throw new Error("Task goal is required");

  return [
    { id: `${taskId}:1`, taskId, order: 1, name: "Understand objective", status: "pending", input: { goal: normalized } },
    { id: `${taskId}:2`, taskId, order: 2, name: "Select tools", status: "pending", input: { availableTools: agent.tools } },
    { id: `${taskId}:3`, taskId, order: 3, name: "Execute objective", status: "pending", input: { instructions: agent.instructions } },
    { id: `${taskId}:4`, taskId, order: 4, name: "Validate result", status: "pending" },
  ];
}
