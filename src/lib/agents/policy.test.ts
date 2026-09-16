import { describe, expect, it } from "vitest";
import { authorizeTool } from "./policy";
import type { AgentDefinition } from "./types";
import type { ToolDefinition } from "./tools";

const baseAgent: AgentDefinition = {
  id: "agent-1",
  name: "Agent",
  description: "",
  instructions: "",
  model: "openai:gpt-5.6",
  tools: ["echo"],
  permissions: ["tool:echo"],
  scopes: [],
  budgetCents: 100,
  status: "active",
};

const scopedTool: ToolDefinition = {
  name: "echo",
  description: "",
  risk: "low",
  permissions: ["tool:echo"],
  scopes: ["customer:read"],
  async execute() { return { ok: true }; },
};

describe("authorizeTool scopes", () => {
  it("denies a scoped tool when the agent lacks the required scope", () => {
    expect(authorizeTool(baseAgent, scopedTool, 0)).toMatchObject({
      allowed: false,
      requiresApproval: false,
      reason: "Agent lacks required tool scope",
    });
  });

  it("allows a scoped low-risk tool when permission and scope are granted", () => {
    expect(authorizeTool({ ...baseAgent, scopes: ["customer:read"] }, scopedTool, 0)).toMatchObject({
      allowed: true,
      requiresApproval: false,
    });
  });

  it("requires every declared scope", () => {
    const tool = { ...scopedTool, scopes: ["customer:read", "customer:write"] };
    expect(authorizeTool({ ...baseAgent, scopes: ["customer:read"] }, tool, 0).allowed).toBe(false);
  });
});
