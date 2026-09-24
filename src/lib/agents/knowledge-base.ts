import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";

export type KnowledgeSourceType = "manual" | "document" | "integration" | "runtime";
export type OrganizationKnowledgeEntry = {
  id: string;
  organizationId: string;
  knowledgeKey: string;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceUri: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type Options = { serviceRole?: boolean };

async function db(options: Options) {
  return options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
}

export async function upsertOrganizationKnowledgeEntry(input: {
  organizationId: string;
  knowledgeKey: string;
  title: string;
  content: string;
  sourceType?: KnowledgeSourceType;
  sourceUri?: string | null;
  metadata?: Record<string, unknown>;
}, options: Options = {}): Promise<string> {
  const client = await db(options);
  const { data, error } = await client.rpc("upsert_organization_knowledge_entry", {
    p_organization_id: input.organizationId,
    p_knowledge_key: input.knowledgeKey,
    p_title: input.title,
    p_content: input.content,
    p_source_type: input.sourceType ?? "manual",
    p_source_uri: input.sourceUri ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error || !data) {
    throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not persist organization knowledge: ${error?.message ?? "missing id"}`, { retryable: true, cause: error });
  }
  return data as string;
}

export async function getOrganizationKnowledge(input: {
  organizationId: string;
  sourceType?: KnowledgeSourceType;
  limit?: number;
}, options: Options = {}): Promise<OrganizationKnowledgeEntry[]> {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 100);
  const client = await db(options);
  let query = client.from("organization_knowledge_entries")
    .select("id,organization_id,knowledge_key,title,content,source_type,source_uri,metadata,created_at,updated_at")
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (input.sourceType) query = query.eq("source_type", input.sourceType);
  const { data, error } = await query;
  if (error) {
    throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load organization knowledge: ${error.message}`, { retryable: true, cause: error });
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    knowledgeKey: row.knowledge_key,
    title: row.title,
    content: row.content,
    sourceType: row.source_type as KnowledgeSourceType,
    sourceUri: row.source_uri,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
