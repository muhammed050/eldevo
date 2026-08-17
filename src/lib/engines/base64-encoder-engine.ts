import { requireInput } from "./shared";
export const run = (input: string) => { requireInput(input); const bytes = new TextEncoder().encode(input); let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); };
