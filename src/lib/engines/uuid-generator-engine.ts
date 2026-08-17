import { requireInput } from "./shared";
export const run = (input: string) => { requireInput(input); const count = Math.max(1, Math.min(20, Number(input.trim()) || 1)); return Array.from({ length: count }, () => crypto.randomUUID()).join("\n"); };
