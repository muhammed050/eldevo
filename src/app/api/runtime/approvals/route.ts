import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ approvalId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) });

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { approvalId, decision } = schema.parse(await request.json());

    const { data: approval } = await supabase.from("approvals").select("id,organization_id,task_id,status").eq("id", approvalId).maybeSingle();
    if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    if (approval.status !== "pending") return NextResponse.json({ error: "Approval is no longer pending" }, { status: 409 });

    const { data: membership } = await supabase.from("memberships").select("role").eq("organization_id", approval.organization_id).eq("user_id", user.id).maybeSingle();
    if (!membership || !["owner", "admin", "manager"].includes(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("approvals").update({ status: decision, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", approvalId).eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (decision === "rejected") {
      await supabase.from("tasks").update({ status: "cancelled", error: "Human approval rejected" }).eq("id", approval.task_id);
    }
    await supabase.from("audit_logs").insert({ organization_id: approval.organization_id, user_id: user.id, action: `approval.${decision}`, resource_type: "approval", resource_id: approvalId, metadata: { task_id: approval.task_id } });
    return NextResponse.json({ ok: true, approvalId, decision });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: memberships } = await supabase.from("memberships").select("organization_id").eq("user_id", user.id);
  const ids = (memberships ?? []).map((m) => m.organization_id);
  if (!ids.length) return NextResponse.json({ approvals: [] });
  const { data, error } = await supabase.from("approvals").select("*").in("organization_id", ids).eq("status", "pending").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ approvals: data ?? [] });
}
