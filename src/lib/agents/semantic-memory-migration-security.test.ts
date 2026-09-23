import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const baseSql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0027_semantic_memory.sql"), "utf8");
const hardeningSql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0028_harden_semantic_memory_writes.sql"), "utf8");

describe("semantic memory migration security", () => {
  it("enables RLS and scopes reads to organization membership", () => {
    expect(baseSql).toContain("alter table public.agent_semantic_memories enable row level security");
    expect(baseSql).toContain("public.is_org_member(organization_id)");
  });
  it("prevents direct client table mutation", () => {
    expect(baseSql).toContain("revoke insert, update, delete on public.agent_semantic_memories from authenticated, anon");
  });
  it("makes semantic-memory RPC writes service-role only", () => {
    expect(hardeningSql).toContain("from public, anon, authenticated");
    expect(hardeningSql).toContain("to service_role");
    expect(hardeningSql).toContain("if auth.role() <> 'service_role' then");
    expect(hardeningSql).not.toContain("to authenticated, service_role");
  });
  it("validates agent and source-task tenant ownership before writes", () => {
    expect(hardeningSql).toContain("a.organization_id = p_organization_id");
    expect(hardeningSql).toContain("t.organization_id = p_organization_id");
    expect(hardeningSql).toContain("t.agent_id = p_agent_id");
  });
  it("rejects null and invalid authoritative memory fields", () => {
    expect(hardeningSql).toContain("p_memory_key is null");
    expect(hardeningSql).toContain("p_content is null");
    expect(hardeningSql).toContain("p_category is null");
    expect(hardeningSql).toContain("p_confidence is null");
    expect(hardeningSql).toContain("p_importance is null");
  });
  it("uses a tenant-and-agent scoped uniqueness key for idempotent facts", () => {
    expect(baseSql).toContain("unique (organization_id, agent_id, memory_key)");
    expect(hardeningSql).toContain("on conflict (organization_id, agent_id, memory_key) do update");
  });
});
