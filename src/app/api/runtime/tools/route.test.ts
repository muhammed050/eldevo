import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  join(process.cwd(), "src/app/api/runtime/tools/route.ts"),
  "utf8",
);

describe("runtime tool discovery security", () => {
  it("requires an authenticated Supabase user before exposing tool metadata", () => {
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain('status: 401');
    expect(route).toContain('error: "Unauthorized"');
  });
});
