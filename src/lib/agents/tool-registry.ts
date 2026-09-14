import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";
import { getTool, type ToolRisk } from "./tools";

const ToolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()),
  output_schema: z.record(z.string(), z.unknown()).default({}),
  risk_level: z.enum(["low", "medium", "high"]),
  permissions: z.array(z.string()).default([]),
  config: z.record(z.string(), z.unknown()).default({}),
  secret_refs: z.array(z.string()).default([]),
  timeout_ms: z.number().int().min(100).max(600_000).default(30_000),
  max_attempts: z.number().int().min(1).max(10).default(1),
  executor_key: z.string().nullable().default(null),
  enabled: z.boolean(),
  organization_id: z.string().uuid().nullable(),
});

export type RegisteredToolDefinition = z.infer<typeof ToolSchema>;

type RegistryOptions = { serviceRole?: boolean; version?: string };

export async function loadToolRegistry(
  organizationId: string,
  allowedNames: string[],
  options?: RegistryOptions,
) {
  if (!allowedNames.length) return [];

  const supabase = options?.serviceRole
    ? createSupabaseServiceClient()
    : await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tools")
    .select("id,name,description,version,input_schema,output_schema,risk_level,permissions,config,secret_refs,timeout_ms,max_attempts,executor_key,enabled,organization_id,created_at")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .in("name", allowedNames)
    .eq("enabled", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new RuntimeError("TOOL_NOT_FOUND", `Tool registry lookup failed: ${error.message}`, {
      retryable: true,
      cause: error,
    });
  }

  const parsed = (data ?? []).map((row) => ToolSchema.parse(row));
  const byName = new Map<string, RegisteredToolDefinition>();

  for (const row of parsed) {
    if (options?.version && row.version !== options.version) continue;
    const current = byName.get(row.name);
    if (!current || (current.organization_id === null && row.organization_id === organizationId)) {
      byName.set(row.name, row);
    }
  }

  return [...byName.values()];
}

export async function resolveRegisteredTool(
  organizationId: string,
  name: string,
  options?: RegistryOptions,
) {
  const tools = await loadToolRegistry(organizationId, [name], options);
  const definition = tools.find((tool) => tool.name === name);

  if (!definition) {
    throw new RuntimeError("TOOL_NOT_FOUND", `Tool '${name}' is not registered or enabled`);
  }

  const executorName = definition.executor_key?.startsWith("builtin:")
    ? definition.executor_key.slice("builtin:".length)
    : definition.name;
  const implementation = getTool(executorName);

  if (!implementation) {
    throw new RuntimeError("TOOL_NOT_FOUND", `Tool '${name}' has no runtime implementation`);
  }

  return {
    definition,
    implementation: {
      ...implementation,
      name: definition.name,
      description: definition.description,
      risk: definition.risk_level as ToolRisk,
      permissions: definition.permissions.length ? definition.permissions : implementation.permissions,
    },
  };
}
