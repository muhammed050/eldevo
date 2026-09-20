import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RuntimeError } from "./errors";

export const ToolMarketplaceMetadataSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(10).max(240),
  category: z.string().trim().min(2).max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export type ToolMarketplaceMetadata = z.infer<typeof ToolMarketplaceMetadataSchema>;

export const ToolMarketplaceListingSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()),
  output_schema: z.record(z.string(), z.unknown()),
  risk_level: z.enum(["low", "medium", "high"]),
  permissions: z.array(z.string()).default([]),
  scopes: z.array(z.string()).default([]),
  marketplace_slug: z.string(),
  marketplace_summary: z.string(),
  marketplace_category: z.string(),
  marketplace_tags: z.array(z.string()).default([]),
  published_at: z.string(),
});

export type ToolMarketplaceListing = z.infer<typeof ToolMarketplaceListingSchema>;

function persistenceError(operation: string, error: { message: string }): RuntimeError {
  return new RuntimeError("STEP_PERSISTENCE_FAILED", `Tool marketplace ${operation} failed: ${error.message}`, {
    retryable: false,
    cause: error,
  });
}

export async function publishTool(toolId: string, metadata: ToolMarketplaceMetadata) {
  const parsed = ToolMarketplaceMetadataSchema.parse(metadata);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("publish_tool_to_marketplace", {
    p_tool_id: toolId,
    p_slug: parsed.slug,
    p_summary: parsed.summary,
    p_category: parsed.category,
    p_tags: parsed.tags,
  });
  if (error) throw persistenceError("publish", error);
  return data;
}

export async function unpublishTool(toolId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("unpublish_tool_from_marketplace", { p_tool_id: toolId });
  if (error) throw persistenceError("unpublish", error);
  return data;
}

export async function listPublishedTools(options?: { category?: string; limit?: number }): Promise<ToolMarketplaceListing[]> {
  const supabase = await createSupabaseServerClient();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  let query = supabase.from("tool_marketplace_catalog").select("*").order("published_at", { ascending: false }).limit(limit);
  if (options?.category) query = query.eq("marketplace_category", options.category);
  const { data, error } = await query;
  if (error) throw persistenceError("catalog lookup", error);
  return z.array(ToolMarketplaceListingSchema).parse(data ?? []);
}
