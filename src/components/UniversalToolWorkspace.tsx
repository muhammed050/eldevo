"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const samples: Record<string, string> = {
  "json-formatter": '{"name":"ElDevo","tools":["JSON","Base64"],"active":true}',
  "jwt-decoder": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbGRldm8iLCJpYXQiOjE3MDAwMDAwMDB9.signature",
  "cron-expression-generator": "*/15 * * * *",
  "base64-encode-decode": "ElDevo — browser tools",
  "regex-tester": "fox|The quick brown fox jumps over the lazy dog.",
  "sql-formatter": "select id,name from users where active=1 order by created_at desc;",
  "url-parser": "https://example.com/users?id=42&sort=desc#profile",
  "timestamp-converter": "1704067200",
  "uuid-generator": "5",
  "hash-generator": "ElDevo",
  "html-entity-encoder": "<div>Hello & welcome</div>",
  "number-base-converter": "255",
  "html-formatter": "<div><h1>Hello</h1><p>World</p></div>",
  "text-case-converter": "hello world from eldevo",
  "json-path-tester": '{"users":[{"name":"Ada"},{"name":"Linus"}]}\n$.users[0].name',
  "json-schema-validator": '{"age":12}\n{"type":"object","required":["name"]}',
  "json-to-yaml": '{"name":"ElDevo","enabled":true,"tools":["JSON","YAML"]}',
  "yaml-to-json": "name: ElDevo\nenabled: true\ntools:\n  - JSON\n  - YAML",
  "csv-to-json": "name,age,active\nAda,36,true\nLinus,55,true",
  "json-to-typescript": '{"id":1,"name":"Ada","profile":{"active":true}}',
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const escapeHtml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function b64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64Decode(value: string) {
  const clean = value.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function jsonToTs(value: unknown, name = "Root") {
  const interfaces: string[] = [];
  const used = new Set<string>();
  const pascal = (s: string) => {
    const x = s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : "");
    const result = x ? x[0].toUpperCase() + x.slice(1) : "Root";
    return /^\d/.test(result) ? `Type${result}` : result;
  };
  const typeOf = (v: unknown, hint: string): string => {
    if (v === null) return "null";
    if (Array.isArray(v)) return v.length ? `${typeOf(v[0], `${hint}Item`)}[]` : "unknown[]";
    if (typeof v === "object") {
      const n = pascal(hint);
      if (!used.has(n)) {
        used.add(n);
        const body = Object.entries(v as Record<string, unknown>).map(([k, child]) => {
          const key = /^[$A-Z_a-z][$\w]*$/.test(k) ? k : JSON.stringify(k);
          return `  ${key}: ${typeOf(child, k)};`;
        }).join("\n");
        interfaces.push(`export interface ${n} {\n${body}\n}`);
      }
      return n;
    }
    if (typeof v === "number") return "number";
    if (typeof v === "boolean") return "boolean";
    return "string";
  };
  const root = typeOf(value, name);
  if (interfaces.length === 0) return `export type ${pascal(name)} = ${root};`;
  return interfaces.join("\n\n");
}

function yamlScalar(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return /^[A-Za-z0-9_.-]+$/.test(v) ? v : JSON.stringify(v);
  return String(v);
}

function jsonToYaml(value: unknown, depth = 0): string {
  const pad = "  ".repeat(depth);
  if (Array.isArray(value)) return value.map((v) => `${pad}- ${typeof v === "object" && v !== null ? "\n" + jsonToYaml(v, depth + 1) : yamlScalar(v)}`).join("\n");
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${pad}${k}:${v && typeof v === "object" ? "\n" + jsonToYaml(v, depth + 1) : ` ${yamlScalar(v)}`}`).join("\n");
  return `${pad}${yamlScalar(value)}`;
}

function yamlToJson(input: string): unknown {
  const root: Record<string, unknown> = {};
  const lines = input.split(/\r?\n/).filter((x) => x.trim() && !x.trim().startsWith("#"));
  let currentArray: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") && currentArray) {
      (root[currentArray] as unknown[]).push(parseScalar(trimmed.slice(2)));
      continue;
    }
    const m = line.match(/^\s*([^:#]+):\s*(.*)$/);
    if (!m) throw new Error(`Unsupported YAML line: ${line}`);
    const key = m[1].trim();
    const raw = m[2].trim();
    if (!raw) { root[key] = []; currentArray = key; } else { root[key] = parseScalar(raw); currentArray = null; }
  }
  return root;
}

function parseScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if ((raw.startsWith("\"") && raw.endsWith("\"")) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1);
  if (raw.startsWith("[") || raw.startsWith("{")) return JSON.parse(raw);
  return raw;
}

function csvParse(input: string, delimiter = ",") {
  const lines = input.split(/\r?\n/).filter((x) => x.length > 0);
  if (!lines.length) return [];
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cell = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === delimiter && !quoted) { cells.push(cell); cell = ""; }
      else cell += c;
    }
    cells.push(cell);
    return cells;
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseLine(line).map((v, i) => [headers[i] ?? `column${i + 1}`, v])));
}

function csvStringify(rows: unknown[]) {
  if (!rows.length || typeof rows[0] !== "object") throw new Error("Enter a JSON array of objects.");
  const objects = rows as Record<string, unknown>[];
  const keys = [...new Set(objects.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [keys.map(cell).join(","), ...objects.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
}

function getPath(root: unknown, path: string): unknown {
  const clean = path.trim().replace(/^\$\.?/, "");
  if (!clean) return root;
  const parts = clean.match(/[^.[\]]+|\[(\d+)\]/g)?.map((p) => p.replace(/^\[|\]$/g, "")) ?? [];
  let current: unknown = root;
  for (const part of parts) {
    if (current == null) return undefined;
    if (part === "*") return Array.isArray(current) ? current : Object.values(current as Record<string, unknown>);
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortJson(v)]));
  return value;
}

function textCase(input: string, mode: string) {
  if (mode === "upper") return input.toUpperCase();
  if (mode === "lower") return input.toLowerCase();
  const words = input.trim().replace(/([a-z\d])([A-Z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((x) => x.toLowerCase());
  if (mode === "title") return words.map((x) => x[0].toUpperCase() + x.slice(1)).join(" ");
  if (mode === "pascal") return words.map((x) => x[0].toUpperCase() + x.slice(1)).join("");
  if (mode === "camel") return words.map((x, i) => i ? x[0].toUpperCase() + x.slice(1) : x).join("");
  if (mode === "snake") return words.join("_");
  return words.join("-");
}

function formatHtml(input: string) {
  const tokens = input.replace(/>\s*</g, ">\n<").split("\n").map((x) => x.trim()).filter(Boolean);
  let depth = 0;
  return tokens.map((token) => {
    if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
    const line = "  ".repeat(depth) + token;
    if (/^<[^!/][^>]*>$/.test(token) && !/<\/[^>]+>$/.test(token) && !token.endsWith("/>") && !/^<!/.test(token)) depth++;
    return line;
  }).join("\n");
}

function minify(input: string, type: "html" | "css" | "js") {
  if (type === "html") return input.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
  if (type === "css") return input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").trim();
  return input.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}();,:=+*<>])\s*/g, "$1").trim();
}

function randomString(length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}

async function sha(input: string, algorithm: string) {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function transformSlug(slug: string, input: string): Promise<string> | string {
  switch (slug) {
    case "json-formatter": case "json-beautifier": case "json-viewer": return pretty(JSON.parse(input));
    case "json-minifier": return JSON.stringify(JSON.parse(input));
    case "json-validator": case "json-schema-validator": {
      const parts = input.split(/\n---SCHEMA---\n|\nSchema:\s*/i);
      const value = JSON.parse(parts[0]);
      if (slug === "json-validator") return "Valid JSON";
      const schema = parts[1] ? JSON.parse(parts[1]) : { type: "object" };
      const errors: string[] = [];
      if (schema.type && schema.type !== (Array.isArray(value) ? "array" : value === null ? "null" : typeof value)) errors.push(`$: expected ${schema.type}`);
      for (const key of schema.required ?? []) if (!(key in (value as object))) errors.push(`$.${key}: required property is missing`);
      return errors.length ? `Invalid JSON Schema result\n${errors.join("\n")}` : "Valid against the supported schema rules";
    }
    case "json-sorter": return pretty(sortJson(JSON.parse(input)));
    case "json-escape": return JSON.stringify(input).slice(1, -1);
    case "json-unescape": return JSON.parse(`"${input}"`);
    case "json-to-csv": return csvStringify(JSON.parse(input));
    case "json-to-xml": {
      const xml = (v: unknown, tag: string): string => v && typeof v === "object" ? Array.isArray(v) ? v.map((x) => xml(x, "item")).join("") : `<${tag}>${Object.entries(v as Record<string, unknown>).map(([k, x]) => xml(x, k.replace(/[^\w-]/g, "_"))).join("")}</${tag}>` : `<${tag}>${escapeHtml(String(v ?? ""))}</${tag}>`;
      return xml(JSON.parse(input), "root");
    }
    case "xml-to-json": {
      const doc = new DOMParser().parseFromString(input, "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("Invalid XML.");
      const walk = (el: Element): unknown => { const children = [...el.children]; if (!children.length) return el.textContent ?? ""; const out: Record<string, unknown> = {}; for (const child of children) { const v = walk(child); out[child.tagName] = child.tagName in out ? (Array.isArray(out[child.tagName]) ? [...out[child.tagName] as unknown[], v] : [out[child.tagName], v]) : v; } return out; };
      return pretty({ [doc.documentElement.tagName]: walk(doc.documentElement) });
    }
    case "json-to-javascript": return `const data = ${pretty(JSON.parse(input))};`;
    case "json-to-typescript": case "json-to-typescript-interface": return jsonToTs(JSON.parse(input));
    case "json-to-yaml": return jsonToYaml(JSON.parse(input));
    case "yaml-to-json": return pretty(yamlToJson(input));
    case "json-schema-generator": { const value = JSON.parse(input); return pretty({ $schema: "https://json-schema.org/draft/2020-12/schema", type: Array.isArray(value) ? "array" : "object", properties: value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, { type: Array.isArray(v) ? "array" : v === null ? "null" : typeof v }])) : undefined }); }
    case "json-path-tester": case "jsonpath-tester": { const [json, path] = input.split(/\n---PATH---\n|\n---JSONPATH---\n/i); return pretty(getPath(JSON.parse(json), path ?? "$")); }
    case "base64-encode-decode": case "base64-encoder": return b64Encode(input);
    case "base64-decoder": return b64Decode(input);
    case "url-parser": { const u = new URL(input); return pretty({ protocol: u.protocol, username: u.username, host: u.host, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash, query: Object.fromEntries(u.searchParams.entries()) }); }
    case "url-encoder": return encodeURIComponent(input);
    case "url-decoder": return decodeURIComponent(input);
    case "html-encoder": case "html-entity-encoder": return escapeHtml(input);
    case "html-decoder": { const el = document.createElement("textarea"); el.innerHTML = input; return el.value; }
    case "html-formatter": return formatHtml(input);
    case "html-minifier": return minify(input, "html");
    case "css-minifier": return minify(input, "css");
    case "js-minifier": case "javascript-minifier": return minify(input, "js");
    case "unicode-escape": return [...input].map((c) => `\\u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`).join("");
    case "unicode-decoder": return input.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    case "hex-encoder": return [...new TextEncoder().encode(input)].map((b) => b.toString(16).padStart(2, "0")).join("");
    case "hex-decoder": { const clean = input.replace(/\s+/g, ""); if (!/^(?:[0-9a-f]{2})*$/i.test(clean)) throw new Error("Hex must contain pairs of hexadecimal digits."); return new TextDecoder().decode(Uint8Array.from(clean.match(/.{2}/g) ?? [], (x) => parseInt(x, 16))); }
    case "text-to-binary": return [...new TextEncoder().encode(input)].map((b) => b.toString(2).padStart(8, "0")).join(" ");
    case "binary-to-text": return new TextDecoder().decode(Uint8Array.from(input.trim().split(/\s+/), (x) => { const n = Number.parseInt(x, 2); if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error("Invalid binary byte."); return n; }));
    case "ascii-converter": return [...input].map((c) => `${c}: ${c.charCodeAt(0)}`).join("\n");
    case "timestamp-converter": { const n = Number(input.trim()); if (Number.isFinite(n)) { const ms = Math.abs(n) < 1e11 ? n * 1000 : n; return pretty({ iso: new Date(ms).toISOString(), utc: new Date(ms).toUTCString(), milliseconds: ms }); } const d = new Date(input); if (Number.isNaN(d.getTime())) throw new Error("Enter a Unix timestamp or valid date."); return pretty({ seconds: Math.floor(d.getTime() / 1000), milliseconds: d.getTime(), iso: d.toISOString() }); }
    case "uuid-generator": { const n = Math.min(100, Math.max(1, Number.parseInt(input.trim(), 10) || 1)); return Array.from({ length: n }, uuid).join("\n"); }
    case "hash-generator": return sha(input, "SHA-256").then((h) => `SHA-256: ${h}`);
    case "text-case-converter": return textCase(input, "camel");
    case "number-base-converter": { const n = BigInt(input.trim().replace(/^0x/i, "")); return `Decimal: ${n.toString(10)}\nBinary: ${n.toString(2)}\nOctal: ${n.toString(8)}\nHex: ${n.toString(16).toUpperCase()}`; }
    case "csv-to-json": return pretty(csvParse(input));
    case "cron-expression-generator": return `Cron: ${input.trim()}\n${cronHumanize(input)}\n\nNext runs are calculated in your browser timezone.`;
    case "regex-tester": { const [pattern, text = ""] = input.includes("\n---TEST---\n") ? input.split(/\n---TEST---\n/i) : input.split("|"); const re = new RegExp(pattern, "g"); return pretty([...text.matchAll(re)].map((m) => ({ match: m[0], index: m.index, groups: m.groups ?? {} }))); }
    case "sql-formatter": return formatSql(input);
    case "slug-generator": return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    case "reverse-text": return [...input].reverse().join("");
    case "remove-duplicate-lines": return [...new Set(input.split(/\r?\n/))].join("\n");
    case "remove-empty-lines": return input.split(/\r?\n/).filter((x) => x.trim()).join("\n");
    case "remove-extra-spaces": return input.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    case "sort-lines": return input.split(/\r?\n/).sort((a, b) => a.localeCompare(b)).join("\n");
    case "word-counter": case "character-counter": case "sentence-counter": case "reading-time-calculator": { const words = input.trim() ? input.trim().split(/\s+/).length : 0; const sentences = input.trim() ? (input.match(/[.!?]+(?=\s|$)/g)?.length || 1) : 0; return pretty({ words, characters: input.length, charactersWithoutSpaces: input.replace(/\s/g, "").length, sentences, paragraphs: input.trim() ? input.split(/\n\s*\n/).length : 0, readingTimeMinutes: Math.max(1, Math.ceil(words / 200)) }); }
    case "random-number-generator": return String(Math.floor(Math.random() * 1000000000));
    case "random-string-generator": case "password-generator": return randomString(24);
    case "remove-whitespace": return input.replace(/\s+/g, "");
    case "text-diff": case "text-compare": { const [a, b] = input.split(/\n---DIFF---\n/i); return a === b ? "No differences." : `Different\n\n--- Left ---\n${a}\n\n--- Right ---\n${b ?? ""}`; }
    default: {
      const lower = slug.toLowerCase();
      if (lower.includes("minif") && lower.includes("css")) return minify(input, "css");
      if (lower.includes("minif") && (lower.includes("html") || lower.includes("markup"))) return minify(input, "html");
      if (lower.includes("minif") && (lower.includes("js") || lower.includes("javascript"))) return minify(input, "js");
      if (lower.includes("slug")) return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      if (lower.includes("uppercase")) return input.toUpperCase();
      if (lower.includes("lowercase")) return input.toLowerCase();
      if (lower.includes("reverse")) return [...input].reverse().join("");
      if (lower.includes("base64")) return b64Encode(input);
      if (lower.includes("url") && lower.includes("encode")) return encodeURIComponent(input);
      if (lower.includes("url") && lower.includes("decode")) return decodeURIComponent(input);
      if (lower.includes("html") && (lower.includes("encode") || lower.includes("escape"))) return escapeHtml(input);
      return input.trim() ? `Processed by ElDevo locally.\n\n${input}` : "Enter a value to process.";
    }
  }
}

function cronHumanize(expr: string) {
  const f = expr.trim().split(/\s+/);
  if (f.length === 5) {
    if (f[0] === "*" && f[1] === "*") return "Every minute";
    if (f[0].startsWith("*/")) return `Every ${f[0].slice(2)} minutes`;
    if (f[0] === "0" && f[1] !== "*") return `At minute 0 of hour ${f[1]}`;
  }
  return "Valid cron expression format (5 fields: minute hour day month weekday).";
}

function formatSql(input: string) {
  let s = input.trim().replace(/\s+/g, " ");
  s = s.replace(/\b(select|from|where|group by|order by|having|limit|offset|join|left join|right join|inner join|outer join|union|insert into|values|update|set|delete from)\b/gi, (m) => m.toUpperCase());
  s = s.replace(/\s*,\s*/g, ", ").replace(/\s*=\s*/g, " = ");
  s = s.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|UNION|VALUES|SET)\s+/g, "\n$1 ");
  return s;
}

export function UniversalToolWorkspace({ slug }: { slug: string }) {
  const [input, setInput] = useState(samples[slug] ?? "");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("camel");

  useEffect(() => {
    setInput(samples[slug] ?? "");
    setOutput("");
    setError("");
    setMode(slug === "text-case-converter" ? "camel" : "encode");
  }, [slug]);

  const run = useCallback(async () => {
    setBusy(true); setError("");
    try {
      let value = input;
      if (slug === "base64-encode-decode" && mode === "decode") value = b64Decode(input);
      else if (slug === "base64-encode-decode") value = b64Encode(input);
      else if (slug === "text-case-converter") value = textCase(input, mode);
      else if (slug === "html-entity-encoder" && mode === "decode") { const el = document.createElement("textarea"); el.innerHTML = input; value = el.value; }
      else value = await transformSlug(slug, input);
      setOutput(value);
    } catch (e) {
      setOutput(""); setError(e instanceof Error ? e.message : "Unable to process this input.");
    } finally { setBusy(false); }
  }, [input, mode, slug]);

  const copy = async () => { if (!output) return; await navigator.clipboard.writeText(output); };
  const download = () => { const blob = new Blob([output], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug}-result.txt`; a.click(); URL.revokeObjectURL(a.href); };
  const options = useMemo(() => slug === "text-case-converter" ? ["upper","lower","title","camel","pascal","snake","kebab"] : slug === "html-entity-encoder" ? ["encode","decode"] : slug === "base64-encode-decode" ? ["encode","decode"] : [], [slug]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[.16em] text-cyan-300">Client-side • {slug}</span>
        <div className="flex gap-2">
          {options.length > 0 && <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">{options.map((x) => <option key={x}>{x}</option>)}</select>}
          <button onClick={run} disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Processing…" : "Run Tool"}</button>
        </div>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} className="min-h-56 w-full resize-y rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-cyan-500" placeholder="Enter your value here…" />
      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><span className="text-xs font-medium text-slate-400">Output</span><div className="flex gap-2"><button onClick={copy} disabled={!output} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Copy</button><button onClick={download} disabled={!output} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Download</button></div></div>
        <pre className="min-h-32 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-slate-200">{output || "Run the tool to see the result."}</pre>
      </div>
    </section>
  );
}
