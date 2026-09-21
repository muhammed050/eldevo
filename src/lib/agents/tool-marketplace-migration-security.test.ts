import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0024_harden_tool_marketplace_catalog.sql"),
  "utf8",
).toLowerCase();

describe("tool marketplace catalog migration security", () => {
  it("removes the cross-tenant published-tools base-table policy", () => {
    expect(migration).toContain('drop policy if exists "authenticated can discover published tools" on public.tools');
    expect(migration).not.toContain('create policy "authenticated can discover published tools"');
  });

  it("exposes only an explicit safe catalog projection", () => {
    expect(migration).toContain("security_invoker = false");
    expect(migration).toContain("security_barrier = true");
    expect(migration).toContain("grant select on public.tool_marketplace_catalog to authenticated");

    const projection = migration.slice(migration.indexOf("create or replace view"), migration.indexOf("revoke all"));
    expect(projection).not.toContain("executor_key");
    expect(projection).not.toContain("secret_refs");
    expect(projection).not.toContain("t.config");
    expect(projection).not.toContain("select *");
  });

  it("does not expose the catalog to anon", () => {
    expect(migration).toContain("revoke all on public.tool_marketplace_catalog from public, anon");
  });
});
