import { describe, expect, it } from "vitest";
import { resolveTaskOrganization } from "./organization";

describe("resolveTaskOrganization", () => {
  it("uses the agent organization when membership matches", () => {
    expect(resolveTaskOrganization("org-a", "org-a")).toBe("org-a");
  });

  it("rejects a mismatched organization membership", () => {
    expect(() => resolveTaskOrganization("org-a", "org-b")).toThrow("Organization membership mismatch");
  });

  it("rejects an empty agent organization", () => {
    expect(() => resolveTaskOrganization("", "")).toThrow("Organization membership mismatch");
  });
});
