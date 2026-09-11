export type Usage = { inputTokens: number; outputTokens: number; costCents: number };

const PRICES_PER_MILLION_CENTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 250, output: 1000 },
  "gpt-4o-mini": { input: 15, output: 60 },
};

export function parseModel(model: string) {
  const provider = model.includes(":") ? model.slice(0, model.indexOf(":")) : "unknown";
  const name = model.includes(":") ? model.slice(model.indexOf(":") + 1) : model;
  return { provider, name };
}

export function calculateCostCents(model: string, inputTokens: number, outputTokens: number) {
  const { name } = parseModel(model);
  const price = PRICES_PER_MILLION_CENTS[name] ?? { input: 0, output: 0 };
  return Math.ceil((inputTokens * price.input + outputTokens * price.output) / 1_000_000);
}

export function addUsage(target: Usage, inputTokens: number, outputTokens: number, costCents: number) {
  target.inputTokens += Math.max(0, inputTokens);
  target.outputTokens += Math.max(0, outputTokens);
  target.costCents += Math.max(0, costCents);
}
