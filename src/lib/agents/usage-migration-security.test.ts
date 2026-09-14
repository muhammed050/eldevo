import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0019_harden_usage_v3.sql"),
  "utf8",
);

describe("usage v3 migration security", () => {
  it("revokes usage writes from browser-facing roles", () => {
    expect(migration).toContain(
      "from public, anon, authenticated",
    );
  });

  it("grants authoritative usage writes only to service_role", () => {
    expect(migration).toContain(
      "to service_role",
    );
    expect(migration).not.toMatch(/to authenticated\s*;/i);
  });

  it("rejects malformed usage instead of silently clamping billing data", () => {
    expect(migration).toContain("invalid_usage_values");
    expect(migration).toContain("input_tokens_out_of_range");
  });
});
