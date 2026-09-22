import { getSupabaseServerClient } from '@/lib/supabase/server';

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  task_id: string | null;
  role: ConversationRole;
  content: unknown;
  created_at: string;
}

export async function createConversation(input: {
  organizationId: string;
  agentId?: string;
  title?: string;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_conversation', {
    p_organization_id: input.organizationId,
    p_agent_id: input.agentId ?? null,
    p_title: input.title ?? null,
  });
  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data as string;
}

export async function appendConversationMessage(input: {
  conversationId: string;
  organizationId: string;
  role: ConversationRole;
  content: unknown;
  taskId?: string;
}): Promise<string> {
  if (input.content === undefined) throw new Error('Conversation message content is required');
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('append_conversation_message', {
    p_conversation_id: input.conversationId,
    p_organization_id: input.organizationId,
    p_role: input.role,
    p_content: input.content,
    p_task_id: input.taskId ?? null,
  });
  if (error) throw new Error(`Failed to append conversation message: ${error.message}`);
  return data as string;
}

export async function getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('id,conversation_id,organization_id,task_id,role,content,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(`Failed to load conversation history: ${error.message}`);
  return (data ?? []) as ConversationMessage[];
}

export async function getTaskHistory(taskId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('task_history_events')
    .select('id,organization_id,task_id,step_id,event_type,status,payload,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(`Failed to load task history: ${error.message}`);
  return data ?? [];
}
