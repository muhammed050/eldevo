import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface QueueItem {
  id: string;
  task_id: string;
  organization_id: string;
  attempts: number;
  max_attempts: number;
  locked_by?: string | null;
}

export async function claimNextTask(workerId: string): Promise<QueueItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("claim_task_queue_item", { p_worker_id: workerId });
  if (error) throw new Error(`Could not claim queue item: ${error.message}`);
  return (data?.[0] as QueueItem | undefined) ?? null;
}

export async function finishTaskQueueItem(queueId: string, workerId: string, success: boolean, errorMessage?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("finish_task_queue_item", {
    p_queue_id: queueId,
    p_worker_id: workerId,
    p_success: success,
    p_error: errorMessage ?? null,
  });
  if (error) throw new Error(`Could not finish queue item: ${error.message}`);
}
