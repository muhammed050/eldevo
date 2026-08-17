export type EngineResult = string | Promise<string>;
export type ToolEngine = (input: string) => EngineResult;

export function requireInput(input: string) {
  if (!input.trim()) throw new Error("Enter input before running the tool.");
}

export function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}
