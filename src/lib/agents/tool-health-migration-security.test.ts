import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0022_harden_tool_health_writes.sql"),
  "utf8",
);

describe("tool health migration security", () => {
  it("revokes authoritative health writes from browser-facing roles", () => {
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("grants health writes only to service_role", () => {
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/to authenticated\s*;/i);
  });

  it("fails closed when the caller is not the service role", () => {
    expect(migration).toContain("auth.role()");
    expect(migration).toContain("raise exception 'forbidden'");
  });

  it("keeps tenant binding and health-value validation", () => {
    expect(migration).toContain("tool_organization_mismatch");
    expect(migration).toContain("invalid_tool_health_status");
    expect(migration).toContain("invalid_tool_health_latency");
  });
});
