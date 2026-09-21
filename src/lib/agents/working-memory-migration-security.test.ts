import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0024_task_working_memory.sql"), "utf8");

describe("task working memory migration security", () => {
  it("enables RLS and scopes reads to organization membership", () => {
    expect(sql).toContain("alter table public.task_working_memory enable row level security");
    expect(sql).toContain("om.organization_id = task_working_memory.organization_id");
    expect(sql).toContain("om.user_id = auth.uid()");
  });

  it("does not allow direct authenticated writes", () => {
    expect(sql).toContain("revoke insert, update, delete on public.task_working_memory from authenticated, anon");
  });

  it("validates tenant ownership before scratchpad mutation", () => {
    expect(sql).toContain("om.organization_id = p_organization_id and om.user_id = auth.uid()");
    expect(sql).toContain("wm.task_id = p_task_id");
    expect(sql).toContain("wm.organization_id = p_organization_id");
  });

  it("keeps runtime state synchronized from persisted task and step transitions", () => {
    expect(sql).toContain("create trigger tasks_sync_working_memory");
    expect(sql).toContain("create trigger task_steps_sync_working_memory");
    expect(sql).toContain("step_outputs = public.task_working_memory.step_outputs || v_outputs");
  });
});
