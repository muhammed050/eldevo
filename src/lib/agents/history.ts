import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";

export type ConversationRole = "user" | "assistant" | "system" | "tool";
type Options = { serviceRole?: boolean };

export type ConversationMessage = {
  id: string;
  conversationId: string;
  organizationId: string;
  taskId: string | null;
  role: ConversationRole;
  content: unknown;
  createdAt: string;
};

async function db(options: Options) {
  return options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
}

export async function createConversation(input: { organizationId: string; agentId?: string; title?: string }, options: Options = {}): Promise<string> {
  const client = await db(options);
  const { data, error } = await client.rpc("create_conversation", {
    p_organization_id: input.organizationId,
    p_agent_id: input.agentId ?? null,
    p_title: input.title ?? null,
  });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not create conversation: ${error.message}`, { retryable: true, cause: error });
  return String(data);
}

export async function appendConversationMessage(input: { conversationId: string; organizationId: string; role: ConversationRole; content: unknown; taskId?: string }, options: Options = {}): Promise<string> {
  if (input.content === undefined || input.content === null) throw new TypeError("Conversation message content is required");
  const client = await db(options);
  const { data, error } = await client.rpc("append_conversation_message", {
    p_conversation_id: input.conversationId,
    p_organization_id: input.organizationId,
    p_role: input.role,
    p_content: input.content,
    p_task_id: input.taskId ?? null,
  });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not append conversation message: ${error.message}`, { retryable: true, cause: error });
  return String(data);
}

export async function getConversationHistory(conversationId: string, options: Options = {}): Promise<ConversationMessage[]> {
  const client = await db(options);
  const { data, error } = await client.from("conversation_messages")
    .select("id,conversation_id,organization_id,task_id,role,content,created_at")
    .eq("conversation_id", conversationId).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load conversation history: ${error.message}`, { retryable: true, cause: error });
  return (data ?? []).map((row) => ({ id: row.id, conversationId: row.conversation_id, organizationId: row.organization_id, taskId: row.task_id, role: row.role as ConversationRole, content: row.content, createdAt: row.created_at }));
}

export async function getTaskHistory(taskId: string, organizationId: string, options: Options = {}) {
  const client = await db(options);
  const { data, error } = await client.from("task_history_events")
    .select("id,organization_id,task_id,step_id,event_type,status,payload,created_at")
    .eq("task_id", taskId).eq("organization_id", organizationId).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load task history: ${error.message}`, { retryable: true, cause: error });
  return data ?? [];
}
