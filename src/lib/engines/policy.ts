export type ToolEngineInputKind = "text" | "json" | "structured-text";

export type ToolEnginePolicy = {
  inputKind: ToolEngineInputKind;
  maxInputBytes: number;
  timeoutMs: number;
  privacy: "local-only";
};

const DEFAULT_POLICY: ToolEnginePolicy = {
  inputKind: "text",
  maxInputBytes: 2_000_000,
  timeoutMs: 5_000,
  privacy: "local-only",
};

export const enginePolicies: Record<string, ToolEnginePolicy> = {
  "json-formatter": { ...DEFAULT_POLICY, inputKind: "json", maxInputBytes: 5_000_000 },
  "jwt-decoder": { ...DEFAULT_POLICY, inputKind: "structured-text", maxInputBytes: 100_000 },
  "base64-encoder": { ...DEFAULT_POLICY, maxInputBytes: 5_000_000 },
  "base64-decoder": { ...DEFAULT_POLICY, maxInputBytes: 5_000_000 },
  "regex-tester": { ...DEFAULT_POLICY, maxInputBytes: 1_000_000, timeoutMs: 2_000 },
  "url-parser": { ...DEFAULT_POLICY, maxInputBytes: 500_000 },
  "timestamp-converter": { ...DEFAULT_POLICY, maxInputBytes: 100_000 },
  "uuid-generator": { ...DEFAULT_POLICY, maxInputBytes: 100 },
  "hash-generator": { ...DEFAULT_POLICY, maxInputBytes: 5_000_000, timeoutMs: 10_000 },
  "html-formatter": { ...DEFAULT_POLICY, maxInputBytes: 2_000_000 },
  "text-case-converter": { ...DEFAULT_POLICY, maxInputBytes: 5_000_000 },
  "json-path-tester": { ...DEFAULT_POLICY, inputKind: "structured-text", maxInputBytes: 5_000_000 },
  "json-schema-validator": { ...DEFAULT_POLICY, inputKind: "structured-text", maxInputBytes: 5_000_000 },
  "cron-generator": { ...DEFAULT_POLICY, maxInputBytes: 10_000 },
  "text-stats": { ...DEFAULT_POLICY, maxInputBytes: 5_000_000 },
};

export function getEnginePolicy(slug: string): ToolEnginePolicy {
  return enginePolicies[slug] ?? DEFAULT_POLICY;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
