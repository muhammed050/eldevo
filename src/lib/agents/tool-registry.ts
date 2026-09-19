import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { classifyRuntimeError, RuntimeError } from "./errors";
import { withRetry, withTimeout } from "./reliability";
import { executeInToolDataSandbox } from "./tool-sandbox";
import { getTool, type ToolContext, type ToolRisk } from "./tools";

const ToolSchema = z.object({
  id: z.string().uuid(), name: z.string().min(1), description: z.string(), version: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()), output_schema: z.record(z.string(), z.unknown()).default({}),
  risk_level: z.enum(["low", "medium", "high"]), permissions: z.array(z.string()).default([]), scopes: z.array(z.string()).default([]),
  config: z.record(z.string(), z.unknown()).default({}), secret_refs: z.array(z.string()).default([]),
  timeout_ms: z.number().int().min(100).max(600_000).default(30_000), max_attempts: z.number().int().min(1).max(10).default(1),
  executor_key: z.string().nullable().default(null), enabled: z.boolean(), organization_id: z.string().uuid().nullable(),
});
export type RegisteredToolDefinition = z.infer<typeof ToolSchema>;
type RegistryOptions = { serviceRole?: boolean; version?: string };

export async function loadToolRegistry(organizationId: string, allowedNames: string[], options?: RegistryOptions) {
  if (!allowedNames.length) return [];
  const supabase = options?.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
  const { data, error } = await supabase.from("tools")
    .select("id,name,description,version,input_schema,output_schema,risk_level,permissions,scopes,config,secret_refs,timeout_ms,max_attempts,executor_key,enabled,organization_id,created_at")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`).in("name", allowedNames).eq("enabled", true).order("created_at", { ascending: false });
  if (error) throw new RuntimeError("TOOL_NOT_FOUND", `Tool registry lookup failed: ${error.message}`, { retryable: true, cause: error });
  const parsed = (data ?? []).map((row) => ToolSchema.parse(row));
  const byName = new Map<string, RegisteredToolDefinition>();
  for (const row of parsed) {
    if (options?.version && row.version !== options.version) continue;
    const current = byName.get(row.name);
    if (!current || (current.organization_id === null && row.organization_id === organizationId)) byName.set(row.name, row);
  }
  return [...byName.values()];
}

export async function checkRegisteredToolHealth(organizationId: string, name: string, options?: RegistryOptions) {
  const startedAt = Date.now();
  const tools = await loadToolRegistry(organizationId, [name], options);
  const definition = tools.find((tool) => tool.name === name);
  if (!definition) throw new RuntimeError("TOOL_NOT_FOUND", `Tool '${name}' is not registered or enabled`);
  const executorName = definition.executor_key?.startsWith("builtin:") ? definition.executor_key.slice(8) : definition.name;
  const implementation = getTool(executorName);
  const status = implementation ? "healthy" : "unhealthy";
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("record_tool_health_check", {
    p_tool_id: definition.id, p_organization_id: definition.organization_id, p_status: status,
    p_latency_ms: Date.now() - startedAt, p_error_code: implementation ? null : "TOOL_NOT_FOUND",
    p_error_message: implementation ? null : `Tool '${name}' has no runtime implementation`,
  });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not record tool health: ${error.message}`, { retryable: true, cause: error });
  return { toolId: definition.id, name: definition.name, version: definition.version, status, latencyMs: Date.now() - startedAt } as const;
}

async function executeWithAuditLog<I, O>(definition: RegisteredToolDefinition, execute: (input: I, context: ToolContext) => Promise<O>, input: I, context: ToolContext, attempt: number): Promise<O> {
  const supabase = createSupabaseServiceClient();
  const startedAt = Date.now();
  const { data: logId, error: startError } = await supabase.rpc("start_tool_execution_log", { p_organization_id: context.organizationId, p_task_id: context.taskId, p_agent_id: context.agentId, p_tool_id: definition.id, p_tool_name: definition.name, p_tool_version: definition.version, p_attempt: attempt });
  if (startError || !logId) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not start tool execution log: ${startError?.message ?? "missing log id"}`, { retryable: true, cause: startError });
  try {
    const result = await execute(input, context);
    const { error: finishError } = await supabase.rpc("finish_tool_execution_log", { p_log_id: logId, p_organization_id: context.organizationId, p_status: "completed", p_duration_ms: Date.now() - startedAt, p_error_code: null, p_error_message: null });
    if (finishError) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not finish tool execution log: ${finishError.message}`, { retryable: true, cause: finishError });
    return result;
  } catch (error) {
    const runtimeError = error instanceof RuntimeError ? error : classifyRuntimeError(error);
    const { error: finishError } = await supabase.rpc("finish_tool_execution_log", { p_log_id: logId, p_organization_id: context.organizationId, p_status: "failed", p_duration_ms: Date.now() - startedAt, p_error_code: runtimeError.code, p_error_message: runtimeError.message });
    if (finishError && runtimeError.code === "STEP_PERSISTENCE_FAILED") throw runtimeError;
    throw runtimeError;
  }
}

async function executeWithToolReliability<I, O>(definition: RegisteredToolDefinition, execute: (input: I, context: ToolContext) => Promise<O>, input: I, context: ToolContext): Promise<O> {
  return withRetry(
    async (attempt, retrySignal) => executeWithAuditLog(
      definition,
      (_input, auditContext) => withTimeout(
        (attemptSignal) => executeInToolDataSandbox(
          (isolatedInput) => execute(isolatedInput, { ...auditContext, signal: attemptSignal }),
          input,
        ),
        definition.timeout_ms,
        retrySignal,
      ),
      input,
      context,
      attempt,
    ),
    {
      maxAttempts: definition.max_attempts,
      signal: context.signal,
      shouldRetry: (error) => classifyRuntimeError(error).retryable,
    },
  );
}

export async function resolveRegisteredTool(organizationId: string, name: string, options?: RegistryOptions) {
  const tools = await loadToolRegistry(organizationId, [name], options); const definition = tools.find((tool) => tool.name === name);
  if (!definition) throw new RuntimeError("TOOL_NOT_FOUND", `Tool '${name}' is not registered or enabled`);
  const executorName = definition.executor_key?.startsWith("builtin:") ? definition.executor_key.slice("builtin:".length) : definition.name;
  const implementation = getTool(executorName);
  if (!implementation) throw new RuntimeError("TOOL_NOT_FOUND", `Tool '${name}' has no runtime implementation`);
  return { definition, implementation: { ...implementation, name: definition.name, description: definition.description, risk: definition.risk_level as ToolRisk, permissions: definition.permissions.length ? definition.permissions : implementation.permissions, scopes: definition.scopes, execute: (input: unknown, context: ToolContext) => executeWithToolReliability(definition, implementation.execute as (input: unknown, context: ToolContext) => Promise<unknown>, input, context) } };
}