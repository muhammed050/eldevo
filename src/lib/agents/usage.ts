export type Usage = { inputTokens: number; outputTokens: number; costCents: number; costMicrocents?: number };

type ModelPrice = { inputCentsPerMillion: number; outputCentsPerMillion: number };

// Prices are explicit snapshots used for deterministic accounting. Keep aliases in
// sync with the runtime model registry and update deliberately when provider prices change.
const PRICES: Record<string, ModelPrice> = {
  "gpt-5.6": { inputCentsPerMillion: 400, outputCentsPerMillion: 2000 },
  "gpt-5.6-sol": { inputCentsPerMillion: 400, outputCentsPerMillion: 2000 },
  "gpt-5.6-terra": { inputCentsPerMillion: 200, outputCentsPerMillion: 1200 },
  "gpt-5.6-luna": { inputCentsPerMillion: 20, outputCentsPerMillion: 120 },
  "gpt-4o": { inputCentsPerMillion: 250, outputCentsPerMillion: 1000 },
  "gpt-4o-mini": { inputCentsPerMillion: 15, outputCentsPerMillion: 60 },
};

export function parseModel(model: string) {
  const provider = model.includes(":") ? model.slice(0, model.indexOf(":")) : "unknown";
  const name = model.includes(":") ? model.slice(model.indexOf(":") + 1) : model;
  return { provider, name };
}

export function getModelPrice(model: string): ModelPrice | null {
  const { name } = parseModel(model);
  return PRICES[name] ?? null;
}

export function calculateCostMicrocents(model: string, inputTokens: number, outputTokens: number) {
  const price = getModelPrice(model);
  if (!price) return 0;

  // One token multiplied by "cents per million tokens" is exactly one microcent.
  return (
    Math.max(0, inputTokens) * price.inputCentsPerMillion +
    Math.max(0, outputTokens) * price.outputCentsPerMillion
  );
}

export function microcentsToCents(costMicrocents: number) {
  return Math.ceil(Math.max(0, costMicrocents) / 1_000_000);
}

export function calculateCostCents(model: string, inputTokens: number, outputTokens: number) {
  return microcentsToCents(calculateCostMicrocents(model, inputTokens, outputTokens));
}

export function addUsage(target: Usage, inputTokens: number, outputTokens: number, costCents: number, costMicrocents?: number) {
  target.inputTokens += Math.max(0, inputTokens);
  target.outputTokens += Math.max(0, outputTokens);
  target.costCents += Math.max(0, costCents);
  if (typeof costMicrocents === "number") {
    target.costMicrocents = (target.costMicrocents ?? 0) + Math.max(0, costMicrocents);
  }
}
