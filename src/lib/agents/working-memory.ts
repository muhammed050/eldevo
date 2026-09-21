import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RuntimeError } from "./errors";

export type TaskWorkingMemory = {
  taskId: string;
  organizationId: string;
  agentId: string | null;
  goal: string;
  taskStatus: string;
  currentStepIndex: number | null;
  currentStepName: string | null;
  currentStepStatus: string | null;
  stepOutputs: Record<string, unknown>;
  scratchpad: Record<string, unknown>;
  version: number;
  updatedAt: string;
};

type Options = { serviceRole?: boolean };

export async function getTaskWorkingMemory(taskId: string, organizationId: string, options: Options = {}): Promise<TaskWorkingMemory | null> {
  const db = options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
  const { data, error } = await db
    .from("task_working_memory")
    .select("task_id,organization_id,agent_id,goal,task_status,current_step_index,current_step_name,current_step_status,step_outputs,scratchpad,version,updated_at")
    .eq("task_id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not load working memory: ${error.message}`, { retryable: true, cause: error });
  if (!data) return null;
  return {
    taskId: data.task_id,
    organizationId: data.organization_id,
    agentId: data.agent_id,
    goal: data.goal,
    taskStatus: data.task_status,
    currentStepIndex: data.current_step_index,
    currentStepName: data.current_step_name,
    currentStepStatus: data.current_step_status,
    stepOutputs: (data.step_outputs ?? {}) as Record<string, unknown>,
    scratchpad: (data.scratchpad ?? {}) as Record<string, unknown>,
    version: Number(data.version),
    updatedAt: data.updated_at,
  };
}

export async function patchTaskWorkingMemory(taskId: string, organizationId: string, patch: Record<string, unknown>, options: Options = {}): Promise<number> {
  const db = options.serviceRole ? createSupabaseServiceClient() : await createSupabaseServerClient();
  const { data, error } = await db.rpc("patch_task_working_memory", {
    p_task_id: taskId,
    p_organization_id: organizationId,
    p_patch: patch,
  });
  if (error) throw new RuntimeError("STEP_PERSISTENCE_FAILED", `Could not patch working memory: ${error.message}`, { retryable: true, cause: error });
  return Number(data);
}
