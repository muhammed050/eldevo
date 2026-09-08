import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { executeTask } from "@/lib/agents/runtime";
import { finishTaskQueueItem, claimNextTask } from "@/lib/agents/queue";
import type { AgentDefinition } from "@/lib/agents/types";

export async function POST(request: Request) {
  const expectedSecret = process.env.ELDEVO_WORKER_SECRET;
  if (!expectedSecret || request.headers.get("x-eldevo-worker-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerId = `worker:${randomUUID()}`;
  let claimedQueueId: string | null = null;

  try {
    const queueItem = await claimNextTask(workerId);
    if (!queueItem) return NextResponse.json({ claimed: false, message: "No queued tasks" });
    claimedQueueId = queueItem.id;

    const supabase = createSupabaseServiceClient();
    const { data: task, error: taskError } = await supabase.from("tasks").select("id,organization_id,agent_id,goal,budget_cents,metadata,created_by,status").eq("id", queueItem.task_id).eq("organization_id", queueItem.organization_id).maybeSingle();
    if (taskError || !task) {
      await finishTaskQueueItem(queueItem.id, workerId, false, taskError?.message ?? "Task not found");
      return NextResponse.json({ claimed: true, queueId: queueItem.id, status: "failed", error: "Task not found" }, { status: 404 });
    }

    const { data: agent, error: agentError } = await supabase.from("agents").select("id,name,description,instructions,model,tools,permissions,budget_cents,status").eq("id", task.agent_id).eq("organization_id", task.organization_id).maybeSingle();
    if (agentError || !agent) {
      await finishTaskQueueItem(queueItem.id, workerId, false, agentError?.message ?? "Agent not found");
      return NextResponse.json({ claimed: true, queueId: queueItem.id, status: "failed", error: "Agent not found" }, { status: 404 });
    }

    const result = await executeTask({ organizationId: task.organization_id, goal: task.goal, agentId: task.agent_id, budgetCents: task.budget_cents, metadata: task.metadata ?? {} }, agent as AgentDefinition, task.created_by, { taskId: task.id, resume: true, serviceRole: true });
    const terminal = ["completed", "failed", "cancelled"].includes(result.status);
    await finishTaskQueueItem(queueItem.id, workerId, terminal, terminal ? undefined : `Task returned ${result.status}`);
    return NextResponse.json({ claimed: true, queueId: queueItem.id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker execution failed";
    if (claimedQueueId) {
      try {
        await finishTaskQueueItem(claimedQueueId, workerId, false, message);
      } catch {
        // Preserve the original worker error; the queue item can be recovered by lock expiry.
      }
    }
    return NextResponse.json({ error: message, queueId: claimedQueueId }, { status: 500 });
  }
}
