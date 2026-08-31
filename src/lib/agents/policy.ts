import type { AgentDefinition } from "./types";
import type { ToolDefinition } from "./tools";

export function authorizeTool(agent: AgentDefinition, tool: ToolDefinition, budgetUsedCents: number) {
  const allowed = tool.permissions.every((permission) => agent.permissions.includes(permission));
  if (!allowed) return { allowed: false, requiresApproval: false, reason: "Agent lacks required permission" };
  if (budgetUsedCents >= agent.budgetCents) return { allowed: false, requiresApproval: false, reason: "Agent budget exceeded" };
  if (tool.risk === "high") return { allowed: false, requiresApproval: true, reason: "High-risk action requires human approval" };
  return { allowed: true, requiresApproval: false };
}
