import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0025_conversation_task_history.sql", "utf8");
const hardeningSql = readFileSync("supabase/migrations/0027_harden_conversation_message_writes.sql", "utf8");

describe("conversation and task history migration", () => {
  it("enables RLS on all history tables", () => {
    expect(sql).toContain("alter table public.conversations enable row level security");
    expect(sql).toContain("alter table public.conversation_messages enable row level security");
    expect(sql).toContain("alter table public.task_history_events enable row level security");
    expect(sql).toContain("public.is_org_member(organization_id)");
  });

  it("prevents direct client mutation and exposes validated RPCs", () => {
    expect(sql).toContain("revoke insert, update, delete on public.conversations, public.conversation_messages, public.task_history_events from authenticated, anon");
    expect(sql).toContain("create or replace function public.create_conversation");
    expect(sql).toContain("create or replace function public.append_conversation_message");
    expect(sql).toContain("organization_id = p_organization_id");
  });

  it("records task and step lifecycle transitions", () => {
    expect(sql).toContain("tasks_record_history");
    expect(sql).toContain("task_steps_record_history");
    expect(sql).toContain("task.status_changed");
    expect(sql).toContain("step.status_changed");
  });

  it("prevents authenticated clients from forging privileged conversation authorship", () => {
    expect(hardeningSql).toContain("if p_role <> 'user'");
    expect(hardeningSql).toContain("privileged conversation role requires service role");
    expect(hardeningSql).toContain("if p_task_id is not null");
    expect(hardeningSql).toContain("task-linked messages require service role");
    expect(hardeningSql).toContain("v_role not in ('authenticated', 'service_role')");
  });

  it("keeps the RPC unavailable to public and anon while allowing authenticated user messages", () => {
    expect(hardeningSql).toContain("revoke all on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) from public, anon");
    expect(hardeningSql).toContain("grant execute on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) to authenticated, service_role");
  });
});
