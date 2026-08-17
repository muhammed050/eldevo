import { pretty, requireInput } from "./shared";
export const run = (input: string) => { requireInput(input); try { return pretty(JSON.parse(input)); } catch (error) { throw new Error(error instanceof Error ? error.message : "Invalid JSON."); } };
