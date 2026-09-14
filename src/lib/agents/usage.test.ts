import { describe, expect, it } from "vitest";
import { addUsage, calculateCostCents, calculateDetailedCostMicrocents, parseModel } from "./usage";

describe("usage accounting helpers", () => {
  it("parses provider-qualified model identifiers", () => {
    expect(parseModel("openai:gpt-4o-mini")).toEqual({ provider: "openai", name: "gpt-4o-mini" });
    expect(parseModel("gpt-4o")).toEqual({ provider: "unknown", name: "gpt-4o" });
  });

  it("calculates configured model cost in cents", () => {
    expect(calculateCostCents("openai:gpt-4o-mini", 1_000_000, 1_000_000)).toBe(75);
    expect(calculateCostCents("openai:gpt-4o", 1_000_000, 1_000_000)).toBe(1250);
  });

  it("rounds sub-cent spend up so billable usage is not silently lost", () => {
    expect(calculateCostCents("openai:gpt-4o-mini", 1, 0)).toBe(1);
  });

  it("prices GPT-5.6 cache reads and cache writes separately", () => {
    expect(calculateDetailedCostMicrocents("openai:gpt-5.6-sol", {
      noCacheInputTokens: 1_000,
      cacheReadInputTokens: 1_000,
      cacheWriteInputTokens: 1_000,
      outputTokens: 1_000,
    })).toBe(2_940_000);
  });

  it("applies GPT-5.6 long-context modifiers above 272K input tokens", () => {
    expect(calculateDetailedCostMicrocents("openai:gpt-5.6-sol", {
      noCacheInputTokens: 273_000,
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 1_000,
    })).toBe(221_400_000);
  });

  it("does not add negative usage values", () => {
    const usage = { inputTokens: 10, outputTokens: 20, costCents: 3 };
    addUsage(usage, -1, 5, -2);
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 25, costCents: 3 });
  });

  it("returns zero cost for models without configured pricing", () => {
    expect(calculateCostCents("mock:test", 1000, 1000)).toBe(0);
  });
});
