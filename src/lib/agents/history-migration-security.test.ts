import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0025_conversation_task_history.sql", "utf8");

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
});
