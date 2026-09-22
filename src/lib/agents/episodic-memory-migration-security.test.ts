import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0026_episodic_memory.sql", "utf8");

describe("episodic memory migration", () => {
  it("enforces organization-scoped read access and blocks client mutation", () => {
    expect(sql).toContain("alter table public.agent_episodes enable row level security");
    expect(sql).toContain("public.is_org_member(organization_id)");
    expect(sql).toContain("revoke insert, update, delete on public.agent_episodes from authenticated, anon");
  });

  it("captures terminal task outcomes idempotently", () => {
    expect(sql).toContain("create or replace function public.capture_task_episode()");
    expect(sql).toContain("tasks_capture_episode");
    expect(sql).toContain("on conflict (task_id) do update");
    expect(sql).toContain("('completed', 'failed', 'cancelled')");
  });

  it("backfills terminal tasks created before episodic memory", () => {
    expect(sql).toContain("Backfill terminal tasks that predate episodic memory");
    expect(sql).toContain("on conflict (task_id) do nothing");
  });
});
