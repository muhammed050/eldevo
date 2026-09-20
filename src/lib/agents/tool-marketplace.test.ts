import { describe, expect, it } from "vitest";
import { ToolMarketplaceMetadataSchema } from "./tool-marketplace";

describe("ToolMarketplaceMetadataSchema", () => {
  it("normalizes valid marketplace metadata", () => {
    const result = ToolMarketplaceMetadataSchema.parse({
      slug: "  CRM-LOOKUP  ",
      summary: "Look up customer records safely.",
      category: "CRM",
      tags: ["crm", "lookup"],
    });
    expect(result.slug).toBe("crm-lookup");
    expect(result.tags).toEqual(["crm", "lookup"]);
  });

  it("rejects unsafe slugs", () => {
    expect(() => ToolMarketplaceMetadataSchema.parse({
      slug: "../../secret",
      summary: "A summary that is long enough.",
      category: "Security",
      tags: [],
    })).toThrow();
  });

  it("caps marketplace tags", () => {
    expect(() => ToolMarketplaceMetadataSchema.parse({
      slug: "safe-tool",
      summary: "A summary that is long enough.",
      category: "Utilities",
      tags: Array.from({ length: 13 }, (_, index) => `tag-${index}`),
    })).toThrow();
  });
});
