export type AgentStatus = "draft" | "active" | "paused" | "archived";
export type TaskStatus = "pending" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  tools: string[];
  permissions: string[];
  budgetCents: number;
  status: AgentStatus;
}

export interface TaskInput {
  organizationId: string;
  goal: string;
  agentId: string;
  budgetCents?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskStep {
  id: string;
  taskId: string;
  order: number;
  name: string;
  status: TaskStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output?: unknown;
  steps: TaskStep[];
  usage: { inputTokens: number; outputTokens: number; costCents: number };
}
