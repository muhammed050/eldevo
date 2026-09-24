import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0028_organization_knowledge_base.sql"), "utf8");

describe("organization knowledge base migration security", () => {
  it("enables RLS and scopes reads to organization members", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("public.is_org_member(organization_id)");
  });

  it("prevents direct client mutations", () => {
    expect(sql).toContain("revoke insert, update, delete on public.organization_knowledge_entries from authenticated, anon");
  });

  it("validates RPC tenant access and bounded content", () => {
    expect(sql).toContain("not public.is_org_member(p_organization_id)");
    expect(sql).toContain("length(p_content) > 1000000");
    expect(sql).toContain("on conflict (organization_id, knowledge_key) do update");
  });

  it("preserves source provenance fields", () => {
    expect(sql).toContain("source_type text not null");
    expect(sql).toContain("source_uri text");
    expect(sql).toContain("created_by uuid references auth.users(id)");
  });
});
