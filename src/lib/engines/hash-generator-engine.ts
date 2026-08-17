import { requireInput } from "./shared";
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
export const run = async (input: string) => { requireInput(input); const data = new TextEncoder().encode(input); const [sha256, sha512] = await Promise.all([crypto.subtle.digest("SHA-256", data), crypto.subtle.digest("SHA-512", data)]); return `SHA-256: ${hex(new Uint8Array(sha256))}\nSHA-512: ${hex(new Uint8Array(sha512))}`; };
