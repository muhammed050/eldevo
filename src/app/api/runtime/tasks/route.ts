import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeTask } from "@/lib/agents/runtime";
import type { AgentDefinition } from "@/lib/agents/types";

const schema = z.object({
  agentId: z.string().uuid(),
  goal: z.string().min(3).max(10000),
  budgetCents: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.parse(await request.json());
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) return NextResponse.json({ error: "No organization membership" }, { status: 403 });

    const { data: dbAgent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, description, instructions, model, tools, permissions, budget_cents, status")
      .eq("id", body.agentId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();
    if (agentError || !dbAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    if (dbAgent.status !== "active") return NextResponse.json({ error: "Agent is not active" }, { status: 409 });

    const agent = dbAgent as AgentDefinition;
    const result = await executeTask({
      organizationId: membership.organization_id,
      goal: body.goal,
      agentId: agent.id,
      budgetCents: body.budgetCents,
      metadata: body.metadata,
    }, agent);

    await supabase.from("audit_logs").insert({
      organization_id: membership.organization_id,
      user_id: user.id,
      action: "task.execute",
      resource_type: "task",
      resource_id: result.taskId,
      metadata: { agent_id: agent.id, status: result.status, usage: result.usage },
    });

    return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
