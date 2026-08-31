import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTool } from "./tools";

const ToolSchema = z.object({
  id: z.string().uuid(), name: z.string(), description: z.string(), version: z.string(),
  input_schema: z.record(z.string(), z.unknown()), risk_level: z.enum(["low", "medium", "high"]), enabled: z.boolean(), organization_id: z.string().uuid().nullable(),
});

export async function loadToolRegistry(organizationId: string, allowedNames: string[]) {
  const supabase = await createSupabaseServerClient();
  if (!allowedNames.length) return [];
  const { data, error } = await supabase.from("tools").select("id,name,description,version,input_schema,risk_level,enabled,organization_id").or(`organization_id.is.null,organization_id.eq.${organizationId}`).in("name", allowedNames).eq("enabled", true);
  if (error) throw new Error(`Tool registry lookup failed: ${error.message}`);
  return (data ?? []).map((row) => ToolSchema.parse(row)).filter((row) => Boolean(getTool(row.name)));
}

export async function resolveRegisteredTool(organizationId: string, name: string) {
  const tools = await loadToolRegistry(organizationId, [name]);
  const definition = tools.find((tool) => tool.name === name);
  if (!definition) throw new Error(`Tool '${name}' is not registered or enabled`);
  const implementation = getTool(name);
  if (!implementation) throw new Error(`Tool '${name}' has no runtime implementation`);
  return { definition, implementation };
}
