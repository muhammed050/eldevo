import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0027_semantic_memory.sql"), "utf8");

describe("semantic memory migration security", () => {
  it("enables RLS and scopes reads to organization membership", () => {
    expect(sql).toContain("alter table public.agent_semantic_memories enable row level security");
    expect(sql).toContain("public.is_org_member(organization_id)");
  });
  it("prevents direct client mutation", () => {
    expect(sql).toContain("revoke insert, update, delete on public.agent_semantic_memories from authenticated, anon");
  });
  it("validates agent and source-task tenant ownership before writes", () => {
    expect(sql).toContain("a.organization_id = p_organization_id");
    expect(sql).toContain("t.organization_id = p_organization_id and t.agent_id = p_agent_id");
  });
  it("uses a tenant-and-agent scoped uniqueness key for idempotent facts", () => {
    expect(sql).toContain("unique (organization_id, agent_id, memory_key)");
    expect(sql).toContain("on conflict (organization_id, agent_id, memory_key) do update");
  });
});
