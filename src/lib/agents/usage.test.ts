import { describe, expect, it } from "vitest";
import { addUsage, calculateCostCents, parseModel } from "./usage";

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

  it("does not add negative usage values", () => {
    const usage = { inputTokens: 10, outputTokens: 20, costCents: 3 };
    addUsage(usage, -1, 5, -2);
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 25, costCents: 3 });
  });

  it("returns zero cost for models without configured pricing", () => {
    expect(calculateCostCents("mock:test", 1000, 1000)).toBe(0);
  });
});
