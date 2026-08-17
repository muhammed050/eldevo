import { format as formatSql } from "sql-formatter";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import Papa from "papaparse";
import { executeTool as legacyExecuteTool } from "./real-engine.ts";

const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: Uint8Array) => [...value].map((x) => x.toString(16).padStart(2, "0")).join("");
const base64Url = (value: string) => { let binary = ""; for (const byte of bytes(value)) binary += String.fromCharCode(byte); return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, ""); };
const parseJson = (value: string): unknown => JSON.parse(value);
const numbers = (value: string) => { const result = value.split(/[,\s]+/).filter(Boolean).map(Number); if (!result.length || result.some((x) => !Number.isFinite(x))) throw new Error("Enter valid numbers."); return result; };

function deepDiff(left: unknown, right: unknown, path = "$"): unknown[] {
  if (Object.is(left, right)) return [];
  if (Array.isArray(left) && Array.isArray(right)) { const changes: unknown[] = []; const length = Math.max(left.length, right.length); for (let i = 0; i < length; i++) changes.push(...deepDiff(left[i], right[i], `${path}[${i}]`)); return changes; }
  if (left && right && typeof left === "object" && typeof right === "object") { const changes: unknown[] = []; const keys = new Set([...Object.keys(left as object), ...Object.keys(right as object)]); for (const key of keys) changes.push(...deepDiff((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], `${path}.${key}`)); return changes; }
  return [{ path, left, right }];
}
function decodeJwt(token: string): string {
  const parts = token.trim().split("."); if (parts.length !== 3) throw new Error("A JWT must contain three Base64URL segments.");
  const decode = (part: string) => { const normalized = part.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(part.length / 4) * 4, "="); return JSON.parse(atob(normalized)); };
  return JSON.stringify({ header: decode(parts[0]), payload: decode(parts[1]), signaturePresent: parts[2].length > 0, signatureVerified: false, note: "Decoded locally; signature was not verified." }, null, 2);
}
async function generateJwt(): Promise<string> {
  const secret = hex(crypto.getRandomValues(new Uint8Array(32))); const header = { alg: "HS256", typ: "JWT" }; const payload = { sub: "eldevo-user", iat: Math.floor(Date.now() / 1000) };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(signingInput)));
  const signatureB64 = btoa(String.fromCharCode(...signature)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  return `${signingInput}.${signatureB64}\nSecret: ${secret}`;
}
function canonicalCron(value: string): string { const fields = value.trim().split(/\s+/); if (fields.length !== 5 && fields.length !== 6) throw new Error("Cron must contain 5 or 6 fields."); return fields.join(" "); }
function convertBase(value: string): string { const [numberText, fromText = "10", toText = "10"] = value.trim().split(/\s+/); const from = Number(fromText), to = Number(toText); if (![2, 8, 10, 16, 36].includes(from) || ![2, 8, 10, 16, 36].includes(to)) throw new Error("Supported bases: 2, 8, 10, 16, 36."); const parsed = Number.parseInt(numberText, from); if (!Number.isFinite(parsed)) throw new Error("Invalid number for the selected base."); return parsed.toString(to).toUpperCase(); }
function convertCase(value: string): string { const [mode, ...rest] = value.trim().split(/\s*:\s*/); const text = rest.length ? rest.join(":") : value; const words = text.match(/[\p{L}\p{N}]+/gu) ?? []; switch (mode.toLowerCase()) { case "camel": return words.map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(""); case "pascal": return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(""); case "snake": return words.map((w) => w.toLowerCase()).join("_"); case "kebab": return words.map((w) => w.toLowerCase()).join("-"); case "upper": return text.toUpperCase(); case "lower": return text.toLowerCase(); case "title": return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" "); default: return text; } }
function textSlug(value: string): string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, ""); }
function parseHmacInput(input: string): { algorithm: "SHA-256" | "SHA-384" | "SHA-512"; key: string; message: string } { const parts = input.split(/\r?\n---HMAC---\r?\n/i); if (parts.length !== 2) throw new Error("Use: algorithm\n---HMAC---\nkey\nmessage"); const [algorithmRaw, body] = parts; const [key, ...messageParts] = body.split(/\r?\n/); const algorithm = algorithmRaw.trim().toUpperCase(); if (!(algorithm === "SHA-256" || algorithm === "SHA-384" || algorithm === "SHA-512")) throw new Error("HMAC supports SHA-256, SHA-384 and SHA-512."); if (!key || !messageParts.length) throw new Error("Provide a key and message after ---HMAC---."); return { algorithm, key, message: messageParts.join("\n") }; }

export async function executeActiveTool(slug: string, input: string): Promise<string> {
  if (!input.trim()) throw new Error("Input is empty.");
  switch (slug) {
    case "jwt-decoder": return decodeJwt(input);
    case "jwt-generator": return generateJwt();
    case "cron-expression-generator": return canonicalCron(input);
    case "cron-parser": { const fields = canonicalCron(input).split(" "); return JSON.stringify({ fields, minute: fields.length === 5 ? fields[0] : fields[1], hour: fields.length === 5 ? fields[1] : fields[2], dayOfMonth: fields.length === 5 ? fields[2] : fields[3], month: fields.length === 5 ? fields[3] : fields[4], dayOfWeek: fields.length === 5 ? fields[4] : fields[5] }, null, 2); }
    case "cron-humanizer": { const fields = canonicalCron(input).split(" "); return fields.length === 5 && fields[0].startsWith("*/") && fields.slice(1).every((x) => x === "*") ? `Every ${fields[0].slice(2)} minutes` : `Cron schedule: ${fields.join(" ")}`; }
    case "sql-formatter": return formatSql(input, { language: "sql" });
    case "timestamp-converter": { const value = input.trim(); const numeric = Number(value); const date = Number.isFinite(numeric) ? new Date(Math.abs(numeric) < 1e11 ? numeric * 1000 : numeric) : new Date(value); if (Number.isNaN(date.getTime())) throw new Error("Enter a Unix timestamp or valid ISO date."); return JSON.stringify({ iso: date.toISOString(), unixSeconds: Math.floor(date.getTime() / 1000), unixMilliseconds: date.getTime() }, null, 2); }
    case "timestamp-generator": { const value = Number(input.trim()); if (!Number.isFinite(value)) throw new Error("Enter a valid Unix timestamp."); return new Date(Math.abs(value) < 1e11 ? value * 1000 : value).toISOString(); }
    case "number-base-converter": return convertBase(input);
    case "text-case-converter": return convertCase(input);
    case "slug-generator": return textSlug(input);
    case "json-unescape": { try { return JSON.parse(`"${input}"`); } catch { throw new Error("Invalid JSON escape sequence."); } }
    case "json-diff": { const [left, right] = input.split(/\r?\n---DIFF---\r?\n/i); if (!right) throw new Error("Provide two JSON documents separated by ---DIFF---."); const changes = deepDiff(parseJson(left), parseJson(right)); return JSON.stringify({ equal: changes.length === 0, changes }, null, 2); }
    case "json-to-yaml": return yamlDump(parseJson(input), { noRefs: true, lineWidth: -1 });
    case "yaml-to-json": return JSON.stringify(yamlLoad(input), null, 2);
    case "csv-to-json": { const parsed = Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: true }); if (parsed.errors.length) throw new Error(parsed.errors[0].message); return JSON.stringify(parsed.data, null, 2); }
    case "json-to-csv": { const value = parseJson(input); if (!Array.isArray(value)) throw new Error("Expected a JSON array of objects."); return Papa.unparse(value); }
    case "hmac-generator": { const { algorithm, key, message } = parseHmacInput(input); const cryptoKey = await crypto.subtle.importKey("raw", bytes(key), { name: "HMAC", hash: algorithm }, false, ["sign"]); return hex(new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, bytes(message)))); }
    case "email-extractor": { const values = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []; return [...new Set(values)].join("\n") || "No email addresses found."; }
    case "url-extractor": { const values = input.match(/https?:\/\/[^\s<>"']+/gi) ?? []; return [...new Set(values)].join("\n") || "No URLs found."; }
    case "canonical-url-generator": { const url = new URL(input.trim()); return `<link rel="canonical" href="${url.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">`; }
    case "percentage-calculator": { const [percent, value] = numbers(input); return String((percent / 100) * value); }
    case "average-calculator": { const a = numbers(input); return String(a.reduce((x, y) => x + y, 0) / a.length); }
    case "rgb-to-hex": { const a = numbers(input); if (a.length !== 3 || a.some((x) => x < 0 || x > 255)) throw new Error("Enter three RGB values from 0 to 255."); return `#${a.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`; }
    case "random-number-generator": { const [min = 0, max = 100] = numbers(input); if (max < min) throw new Error("Max must be greater than or equal to min."); const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32; return String(Math.floor(min + random * (max - min + 1))); }
    default: return legacyExecuteTool(slug, input);
  }
}
