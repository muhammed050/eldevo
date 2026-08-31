export type ToolRisk = "low" | "medium" | "high";

export interface ToolContext {
  organizationId: string;
  agentId: string;
  taskId: string;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  risk: ToolRisk;
  permissions: string[];
  execute: (input: I, context: ToolContext) => Promise<O>;
}

const tools = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition) {
  if (tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
  tools.set(tool.name, tool);
}

export function getTool(name: string) {
  return tools.get(name);
}

export function listTools() {
  return [...tools.values()].map(({ execute: _execute, ...tool }) => tool);
}

registerTool({
  name: "echo",
  description: "Returns structured input. Safe development tool used to verify the runtime.",
  risk: "low",
  permissions: ["tool:echo"],
  async execute(input) { return { ok: true, input }; },
});
