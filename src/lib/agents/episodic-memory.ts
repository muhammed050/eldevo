import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";

type Options = { serviceRole?: boolean };

export type AgentEpisode = {
  id: string;
  organizationId: string;
  agentId: string;
  taskId: string;
  goal: string;
  outcome: "completed" | "failed" | "cancelled";
  result: unknown;
  error: string | null;
  summary: string;
  importance: number;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

async function db(options: Options) {
  return options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
}

export async function getRecentAgentEpisodes(
  input: { organizationId: string; agentId: string; limit?: number; minImportance?: number },
  options: Options = {},
): Promise<AgentEpisode[]> {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 100);
  const minImportance = Math.min(Math.max(Math.trunc(input.minImportance ?? 0), 0), 100);
  const client = await db(options);
  const { data, error } = await client
    .from("agent_episodes")
    .select("id,organization_id,agent_id,task_id,goal,outcome,result,error,summary,importance,metadata,occurred_at")
    .eq("organization_id", input.organizationId)
    .eq("agent_id", input.agentId)
    .gte("importance", minImportance)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load episodic memory: ${error.message}`, {
      retryable: true,
      cause: error,
    });
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    agentId: row.agent_id,
    taskId: row.task_id,
    goal: row.goal,
    outcome: row.outcome as AgentEpisode["outcome"],
    result: row.result,
    error: row.error,
    summary: row.summary,
    importance: row.importance,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    occurredAt: row.occurred_at,
  }));
}
