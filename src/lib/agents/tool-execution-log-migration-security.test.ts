import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0023_harden_tool_execution_log_writes.sql"),
  "utf8",
);

describe("tool execution log migration security", () => {
  it("revokes authoritative telemetry writes from browser-facing roles", () => {
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("grants execution-log writes only to service_role", () => {
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/to authenticated\s*;/i);
  });

  it("fails closed when the caller is not the service role", () => {
    expect(migration).toContain("auth.role()");
    expect(migration).toContain("raise exception 'forbidden'");
  });

  it("keeps task/tool tenant binding and rejects invalid terminal values", () => {
    expect(migration).toContain("invalid_task_context");
    expect(migration).toContain("invalid_tool_context");
    expect(migration).toContain("invalid_status");
    expect(migration).toContain("invalid_duration");
  });
});
