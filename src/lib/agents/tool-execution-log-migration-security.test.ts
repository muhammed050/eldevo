import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0023_harden_tool_execution_log_writes.sql"),
  "utf8",
);
const attemptMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/0024_harden_attempt_aware_tool_execution_logs.sql"),
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

  it("keeps the attempt-aware overload service-role-only", () => {
    expect(attemptMigration).toContain("text, text, integer)");
    expect(attemptMigration).toContain("from public, anon, authenticated");
    expect(attemptMigration).toContain("to service_role");
    expect(attemptMigration).not.toMatch(/to authenticated\s*;/i);
    expect(attemptMigration).toContain("coalesce(auth.role(), '') <> 'service_role'");
  });

  it("rejects invalid retry attempt numbers and removes the obsolete overload", () => {
    expect(attemptMigration).toContain("p_attempt is null or p_attempt < 1");
    expect(attemptMigration).toContain("raise exception 'invalid_attempt'");
    expect(attemptMigration).toContain("drop function if exists public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text)");
  });
});
