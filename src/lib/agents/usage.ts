export type Usage = { inputTokens: number; outputTokens: number; costCents: number; costMicrocents?: number };

export type DetailedTokenUsage = {
  noCacheInputTokens: number;
  cacheReadInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
};

type ModelPrice = {
  inputCentsPerMillion: number;
  cachedInputCentsPerMillion?: number;
  cacheWriteCentsPerMillion?: number;
  outputCentsPerMillion: number;
  longContextThresholdTokens?: number;
  longContextInputMultiplier?: number;
  longContextOutputMultiplier?: number;
};

// Prices are explicit snapshots used for deterministic preflight budget checks.
// Authoritative persisted billing is calculated from dated database pricing rows.
const PRICES: Record<string, ModelPrice> = {
  "gpt-5.6": { inputCentsPerMillion: 400, cachedInputCentsPerMillion: 40, cacheWriteCentsPerMillion: 500, outputCentsPerMillion: 2000, longContextThresholdTokens: 272_000, longContextInputMultiplier: 2, longContextOutputMultiplier: 1.5 },
  "gpt-5.6-sol": { inputCentsPerMillion: 400, cachedInputCentsPerMillion: 40, cacheWriteCentsPerMillion: 500, outputCentsPerMillion: 2000, longContextThresholdTokens: 272_000, longContextInputMultiplier: 2, longContextOutputMultiplier: 1.5 },
  "gpt-5.6-terra": { inputCentsPerMillion: 200, cachedInputCentsPerMillion: 20, cacheWriteCentsPerMillion: 250, outputCentsPerMillion: 1200, longContextThresholdTokens: 272_000, longContextInputMultiplier: 2, longContextOutputMultiplier: 1.5 },
  "gpt-5.6-luna": { inputCentsPerMillion: 20, cachedInputCentsPerMillion: 2, cacheWriteCentsPerMillion: 25, outputCentsPerMillion: 120, longContextThresholdTokens: 272_000, longContextInputMultiplier: 2, longContextOutputMultiplier: 1.5 },
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

export function calculateDetailedCostMicrocents(model: string, usage: DetailedTokenUsage) {
  const price = getModelPrice(model);
  if (!price) return 0;

  const noCache = Math.max(0, usage.noCacheInputTokens);
  const cacheRead = Math.max(0, usage.cacheReadInputTokens);
  const cacheWrite = Math.max(0, usage.cacheWriteInputTokens);
  const output = Math.max(0, usage.outputTokens);
  const totalInput = noCache + cacheRead + cacheWrite;
  const longContext = Boolean(price.longContextThresholdTokens && totalInput > price.longContextThresholdTokens);
  const inputMultiplier = longContext ? price.longContextInputMultiplier ?? 1 : 1;
  const outputMultiplier = longContext ? price.longContextOutputMultiplier ?? 1 : 1;

  return Math.ceil(
    noCache * price.inputCentsPerMillion * inputMultiplier
      + cacheRead * (price.cachedInputCentsPerMillion ?? price.inputCentsPerMillion) * inputMultiplier
      + cacheWrite * (price.cacheWriteCentsPerMillion ?? price.inputCentsPerMillion) * inputMultiplier
      + output * price.outputCentsPerMillion * outputMultiplier,
  );
}

export function calculateCostMicrocents(model: string, inputTokens: number, outputTokens: number) {
  return calculateDetailedCostMicrocents(model, {
    noCacheInputTokens: inputTokens,
    cacheReadInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens,
  });
}

export function microcentsToCents(costMicrocents: number) {
  return Math.ceil(Math.max(0, costMicrocents) / 1_000_000);
}

export function calculateDetailedCostCents(model: string, usage: DetailedTokenUsage) {
  return microcentsToCents(calculateDetailedCostMicrocents(model, usage));
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
