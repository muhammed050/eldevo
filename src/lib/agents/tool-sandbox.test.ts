import { describe, expect, it } from "vitest";
import { executeInToolDataSandbox } from "./tool-sandbox";

const smallLimits = { maxInputBytes: 128, maxOutputBytes: 128, maxDepth: 4, maxKeys: 8 };

describe("tool data sandbox", () => {
  it("copies JSON input so adapters cannot mutate caller-owned data", async () => {
    const input = { nested: { value: "before" } };
    const result = await executeInToolDataSandbox(async (isolated: typeof input) => {
      isolated.nested.value = "inside";
      return isolated;
    }, input, smallLimits);

    expect(input.nested.value).toBe("before");
    expect(result.nested.value).toBe("inside");
  });

  it("rejects non-JSON executable values", async () => {
    await expect(executeInToolDataSandbox(async (input) => input, { callback: () => "no" } as never, smallLimits))
      .rejects.toMatchObject({ code: "TOOL_DENIED" });
  });

  it("rejects excessive nesting", async () => {
    await expect(executeInToolDataSandbox(async (input) => input, { a: { b: { c: { d: { e: 1 } } } } }, smallLimits))
      .rejects.toMatchObject({ code: "TOOL_DENIED" });
  });

  it("rejects oversized output", async () => {
    await expect(executeInToolDataSandbox(async () => ({ value: "x".repeat(200) }), {}, smallLimits))
      .rejects.toMatchObject({ code: "TOOL_DENIED" });
  });
});
