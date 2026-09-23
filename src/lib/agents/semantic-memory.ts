import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";

type Options = { serviceRole?: boolean };
export type SemanticMemoryCategory = "fact" | "preference" | "procedure" | "concept";
export type SemanticMemory = {
  id: string; organizationId: string; agentId: string; memoryKey: string; content: string;
  category: SemanticMemoryCategory; confidence: number; importance: number; sourceTaskId: string | null;
  metadata: Record<string, unknown>; createdAt: string; updatedAt: string;
};

async function db(options: Options) {
  return options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
}

export async function rememberSemanticMemory(input: {
  organizationId: string; agentId: string; memoryKey: string; content: string;
  category?: SemanticMemoryCategory; confidence?: number; importance?: number;
  sourceTaskId?: string | null; metadata?: Record<string, unknown>;
}, options: Options = {}): Promise<string> {
  const client = await db(options);
  const { data, error } = await client.rpc("upsert_agent_semantic_memory", {
    p_organization_id: input.organizationId,
    p_agent_id: input.agentId,
    p_memory_key: input.memoryKey,
    p_content: input.content,
    p_category: input.category ?? "fact",
    p_confidence: input.confidence ?? 1,
    p_importance: input.importance ?? 50,
    p_source_task_id: input.sourceTaskId ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error || !data) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not persist semantic memory: ${error?.message ?? "missing id"}`, { retryable: true, cause: error });
  return data as string;
}

export async function getAgentSemanticMemories(input: {
  organizationId: string; agentId: string; category?: SemanticMemoryCategory; limit?: number; minImportance?: number;
}, options: Options = {}): Promise<SemanticMemory[]> {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 100);
  const minImportance = Math.min(Math.max(Math.trunc(input.minImportance ?? 0), 0), 100);
  const client = await db(options);
  let query = client.from("agent_semantic_memories")
    .select("id,organization_id,agent_id,memory_key,content,category,confidence,importance,source_task_id,metadata,created_at,updated_at")
    .eq("organization_id", input.organizationId).eq("agent_id", input.agentId)
    .gte("importance", minImportance).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(limit);
  if (input.category) query = query.eq("category", input.category);
  const { data, error } = await query;
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load semantic memory: ${error.message}`, { retryable: true, cause: error });
  return (data ?? []).map((row) => ({
    id: row.id, organizationId: row.organization_id, agentId: row.agent_id, memoryKey: row.memory_key,
    content: row.content, category: row.category as SemanticMemoryCategory, confidence: row.confidence,
    importance: row.importance, sourceTaskId: row.source_task_id, metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}
