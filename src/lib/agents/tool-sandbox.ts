import { RuntimeError } from "./errors";

export type ToolSandboxLimits = {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxDepth: number;
  maxKeys: number;
};

export const DEFAULT_TOOL_SANDBOX_LIMITS: ToolSandboxLimits = {
  maxInputBytes: 256 * 1024,
  maxOutputBytes: 1024 * 1024,
  maxDepth: 32,
  maxKeys: 10_000,
};

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function byteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch (cause) {
    throw new RuntimeError("TOOL_DENIED", "Tool payload must be JSON serializable", { cause });
  }
}

function copyJsonValue(value: unknown, limits: ToolSandboxLimits, depth = 0, keyCount = { value: 0 }): unknown {
  if (depth > limits.maxDepth) throw new RuntimeError("TOOL_DENIED", "Tool payload exceeds maximum nesting depth");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RuntimeError("TOOL_DENIED", "Tool payload contains a non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => copyJsonValue(item, limits, depth + 1, keyCount));
  if (typeof value !== "object") throw new RuntimeError("TOOL_DENIED", "Tool payload contains a non-JSON value");

  const result: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    keyCount.value += 1;
    if (keyCount.value > limits.maxKeys) throw new RuntimeError("TOOL_DENIED", "Tool payload contains too many fields");
    if (FORBIDDEN_KEYS.has(key)) throw new RuntimeError("TOOL_DENIED", `Tool payload contains forbidden field '${key}'`);
    result[key] = copyJsonValue(child, limits, depth + 1, keyCount);
  }
  return result;
}

function isolatePayload(value: unknown, maxBytes: number, limits: ToolSandboxLimits): unknown {
  if (byteLength(value) > maxBytes) throw new RuntimeError("TOOL_DENIED", `Tool payload exceeds ${maxBytes} byte limit`);
  return copyJsonValue(value, limits);
}

/**
 * Creates a strict JSON-only data boundary around a trusted server-side tool adapter.
 * This blocks prototype-pollution keys, executable/non-JSON values, excessive nesting,
 * field-count abuse and oversized input/output. It deliberately does not claim OS/process
 * isolation; untrusted executable adapters must not be registered through this path.
 */
export async function executeInToolDataSandbox<I, O>(
  execute: (input: I) => Promise<O>,
  input: I,
  limits: ToolSandboxLimits = DEFAULT_TOOL_SANDBOX_LIMITS,
): Promise<O> {
  const isolatedInput = isolatePayload(input, limits.maxInputBytes, limits) as I;
  const output = await execute(isolatedInput);
  return isolatePayload(output, limits.maxOutputBytes, limits) as O;
}
