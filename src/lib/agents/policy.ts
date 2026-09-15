import type { AgentDefinition } from "./types";
import type { ToolDefinition } from "./tools";

export function authorizeTool(agent: AgentDefinition, tool: ToolDefinition, budgetUsedCents: number) {
  const allowed = tool.permissions.every((permission) => agent.permissions.includes(permission));
  if (!allowed) return { allowed: false, requiresApproval: false, reason: "Agent lacks required permission" };

  const agentScopes = agent.scopes ?? [];
  const requiredScopes = tool.scopes ?? [];
  const scopesAllowed = requiredScopes.every((scope) => agentScopes.includes(scope));
  if (!scopesAllowed) return { allowed: false, requiresApproval: false, reason: "Agent lacks required tool scope" };

  if (budgetUsedCents >= agent.budgetCents) return { allowed: false, requiresApproval: false, reason: "Agent budget exceeded" };
  if (tool.risk === "high") return { allowed: false, requiresApproval: true, reason: "High-risk action requires human approval" };
  return { allowed: true, requiresApproval: false };
}
