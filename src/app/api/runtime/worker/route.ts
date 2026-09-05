import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeTask } from "@/lib/agents/runtime";
import { finishTaskQueueItem, claimNextTask } from "@/lib/agents/queue";
import type { AgentDefinition } from "@/lib/agents/types";

export async function POST(request: Request) {
  const expectedSecret = process.env.ELDEVO_WORKER_SECRET;
  if (expectedSecret && request.headers.get("x-eldevo-worker-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queueItem = await claimNextTask(`worker:${randomUUID()}`);
    if (!queueItem) return NextResponse.json({ claimed: false, message: "No queued tasks" });

    const supabase = await createSupabaseServerClient();
    const { data: task, error: taskError } = await supabase.from("tasks").select("id,organization_id,agent_id,goal,budget_cents,metadata,created_by,status").eq("id", queueItem.task_id).eq("organization_id", queueItem.organization_id).maybeSingle();
    if (taskError || !task) {
      await finishTaskQueueItem(queueItem.id, false, taskError?.message ?? "Task not found");
      return NextResponse.json({ claimed: true, queueId: queueItem.id, status: "failed", error: "Task not found" }, { status: 404 });
    }

    const { data: agent, error: agentError } = await supabase.from("agents").select("id,name,description,instructions,model,tools,permissions,budget_cents,status").eq("id", task.agent_id).eq("organization_id", task.organization_id).maybeSingle();
    if (agentError || !agent) {
      await finishTaskQueueItem(queueItem.id, false, agentError?.message ?? "Agent not found");
      return NextResponse.json({ claimed: true, queueId: queueItem.id, status: "failed", error: "Agent not found" }, { status: 404 });
    }

    const result = await executeTask({ organizationId: task.organization_id, goal: task.goal, agentId: task.agent_id, budgetCents: task.budget_cents, metadata: task.metadata ?? {} }, agent as AgentDefinition, task.created_by, { taskId: task.id, resume: task.status === "waiting_approval" });
    const terminal = ["completed", "failed", "cancelled"].includes(result.status);
    await finishTaskQueueItem(queueItem.id, terminal, terminal ? undefined : `Task returned ${result.status}`);
    return NextResponse.json({ claimed: true, queueId: queueItem.id, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Worker execution failed" }, { status: 500 });
  }
}
