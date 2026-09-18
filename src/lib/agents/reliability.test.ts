import { describe, expect, it } from "vitest";
import { mapConcurrent, withRetry } from "./reliability";

describe("withRetry", () => {
  it("stops immediately when the retry classifier rejects the error", async () => {
    let attempts = 0;
    await expect(withRetry(async () => {
      attempts += 1;
      throw new Error("permanent");
    }, { maxAttempts: 5, shouldRetry: () => false })).rejects.toThrow("permanent");
    expect(attempts).toBe(1);
  });

  it("retries classified transient failures up to success", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("transient");
      return "ok";
    }, { maxAttempts: 4, baseDelayMs: 1, shouldRetry: () => true });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });
});

describe("mapConcurrent", () => {
  it("preserves result order while respecting the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapConcurrent(
      [30, 10, 20, 5],
      async (delay, index) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, delay));
        active -= 1;
        return index * 2;
      },
      2,
    );

    expect(results).toEqual([0, 2, 4, 6]);
    expect(maxActive).toBe(2);
  });

  it("returns an empty result without invoking the worker", async () => {
    let called = false;
    const results = await mapConcurrent([], async () => {
      called = true;
      return 1;
    });

    expect(results).toEqual([]);
    expect(called).toBe(false);
  });
});