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

  it("rejects accessor properties without invoking them", async () => {
    let invoked = false;
    const input = Object.defineProperty({}, "secret", {
      enumerable: true,
      get() {
        invoked = true;
        return "leaked";
      },
    });

    await expect(executeInToolDataSandbox(async (value) => value, input, smallLimits))
      .rejects.toMatchObject({ code: "TOOL_DENIED" });
    expect(invoked).toBe(false);
  });

  it("rejects class instances instead of silently coercing them", async () => {
    class Payload { value = "unsafe"; }
    await expect(executeInToolDataSandbox(async (value) => value, new Payload(), smallLimits))
      .rejects.toMatchObject({ code: "TOOL_DENIED" });
  });

  it("rejects symbol fields instead of silently dropping them", async () => {
    const input = { value: "ok", [Symbol("hidden")]: "secret" };
    await expect(executeInToolDataSandbox(async (value) => value, input, smallLimits))
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
