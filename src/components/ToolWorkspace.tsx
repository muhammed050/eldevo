"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Check, Copy, Download, FileUp, RefreshCw, Trash2 } from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";

const samples: Record<string, string> = {
  "json-formatter":
    '{\n  "service": "ElDevo",\n  "tools": ["json", "jwt", "cron"],\n  "private": true\n}',
  "jwt-decoder":
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbGRldm8iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjA5OTM1MjAwMH0.signature",
  "cron-expression-generator": "0 3 * * 1-5",
  "base64-encode-decode": "ElDevo · client-side tools",
  "regex-tester": "The quick brown fox jumps over the lazy dog. fox@example.com",
  "sql-formatter": "select id,name,email from users where active = 1 order by created_at desc;",
  "url-parser": "https://example.com/users?id=42&sort=desc#profile",
  "timestamp-converter": "1704067200",
  "uuid-generator": "Generate 5 UUIDs",
  "hash-generator": "ElDevo",
  "html-entity-encoder": "<div>Hello & welcome</div>",
  "number-base-converter": "255",
  "html-formatter": "<div><h1>Hello</h1><p>World</p></div>",
  "text-case-converter": "hello world from eldevo",
  "json-path-tester":
    '{"users":[{"name":"Ada"},{"name":"Linus"}]}\n---JSONPATH---\n$.users[0].name',
  "json-schema-validator":
    '{"age":12}\n---SCHEMA---\n{"type":"object","required":["name"],"properties":{"name":{"type":"string"},"age":{"type":"number"}}}',
  "json-to-yaml": '{"name":"ElDevo","enabled":true,"tools":["JSON","YAML"]}',
  "yaml-to-json": "name: ElDevo\nenabled: true\ntools:\n  - JSON\n  - YAML",
  "csv-to-json": "name,age,active\nAda,36,true\nLinus,55,true",
  "json-to-typescript": '{"id":1,"name":"Ada","profile":{"active":true}}',
};

function parseJsonError(message: string, input: string) {
  const match = message.match(/position\s+(\d+)/i);
  if (!match) return message;
  const position = Number(match[1]);
  const before = input.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  return `${message} · line ${line}, column ${column}`;
}

function utf8ToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function base64ToUtf8(value: string) {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function decodeJwtPart(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToUtf8(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

function jsonToTypescript(value: unknown, rootName = "Root") {
  const interfaces: string[] = [];
  const used = new Set<string>();
  const pascal = (value: string) => {
    const result = value.replace(/[^a-zA-Z0-9]+(.)?/g, (_, char: string | undefined) =>
      char ? char.toUpperCase() : "",
    );
    return (result ? result[0].toUpperCase() + result.slice(1) : "Root").replace(/^\d/, "Type$&");
  };
  const safeKey = (key: string) => (/^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? key : JSON.stringify(key));
  const infer = (item: unknown, hint: string): string => {
    if (item === null) return "null";
    if (Array.isArray(item))
      return item.length ? `${infer(item[0], `${hint}Item`)}[]` : "unknown[]";
    if (typeof item === "object") {
      const name = pascal(hint);
      if (!used.has(name)) {
        used.add(name);
        const body = Object.entries(item as Record<string, unknown>)
          .map(([key, child]) => `  ${safeKey(key)}: ${infer(child, key)};`)
          .join("\n");
        interfaces.push(`export interface ${name} {\n${body}\n}`);
      }
      return name;
    }
    if (typeof item === "number") return "number";
    if (typeof item === "boolean") return "boolean";
    return "string";
  };
  const rootType = infer(value, rootName);
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const root = pascal(rootName);
    const rootIndex = interfaces.findIndex((entry) =>
      entry.startsWith(`export interface ${root} `),
    );
    if (rootIndex >= 0) interfaces.unshift(interfaces.splice(rootIndex, 1)[0]);
  } else {
    interfaces.unshift(`export type ${pascal(rootName)} = ${rootType};`);
  }
  return interfaces.join("\n\n");
}

function parseCronField(field: string, min: number, max: number) {
  const values = new Set<number>();
  for (const token of field.split(",")) {
    const [rangePart, stepText] = token.split("/");
    const step = stepText ? Number(stepText) : 1;
    if (!Number.isInteger(step) || step <= 0) throw new Error(`Invalid cron step: ${token}`);
    const range =
      rangePart === "*"
        ? [min, max]
        : rangePart.includes("-")
          ? rangePart.split("-").map(Number)
          : [Number(rangePart), Number(rangePart)];
    if (
      range.some((number) => !Number.isInteger(number)) ||
      range[0] < min ||
      range[1] > max ||
      range[0] > range[1]
    ) {
      throw new Error(`Invalid cron field: ${field}`);
    }
    for (let value = range[0]; value <= range[1]; value += step) values.add(value);
  }
  return values;
}

function nextCronRuns(expression: string) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6)
    throw new Error("Cron must contain 5 or 6 fields.");
  const [minute, hour, day, month, weekday] = fields.length === 6 ? fields.slice(1) : fields;
  const minutes = parseCronField(minute, 0, 59);
  const hours = parseCronField(hour, 0, 23);
  const days = parseCronField(day, 1, 31);
  const months = parseCronField(month, 1, 12);
  const weekdays = parseCronField(weekday, 0, 7);
  const result: string[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  let guard = 0;
  while (result.length < 5 && guard++ < 525600) {
    const cronDay = cursor.getDay();
    const weekdayMatches = weekdays.has(cronDay) || (cronDay === 0 && weekdays.has(7));
    if (
      minutes.has(cursor.getMinutes()) &&
      hours.has(cursor.getHours()) &&
      days.has(cursor.getDate()) &&
      months.has(cursor.getMonth() + 1) &&
      weekdayMatches
    ) {
      result.push(cursor.toLocaleString());
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  if (!result.length) throw new Error("No matching run times found within the preview window.");
  return result;
}

function formatHtml(input: string, indent: number) {
  const tokens = input
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const output: string[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
    output.push(" ".repeat(depth * indent) + token);
    if (
      /^<[^!/][^>]*>$/.test(token) &&
      !/<\/[^>]+>$/.test(token) &&
      !token.endsWith("/>") &&
      !/^<!/i.test(token)
    )
      depth += 1;
  }
  return output.join("\n");
}

function convertCase(value: string, mode: string) {
  const words = value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  if (mode === "upper") return value.toUpperCase();
  if (mode === "lower") return value.toLowerCase();
  if (mode === "title")
    return words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
  if (mode === "camel")
    return words
      .map((word, index) => (index ? word[0]?.toUpperCase() + word.slice(1) : word))
      .join("");
  if (mode === "pascal")
    return words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join("");
  if (mode === "snake") return words.join("_");
  return words.join("-");
}

function getJsonPath(root: unknown, path: string) {
  const clean = path.trim().replace(/^\$\.?/, "");
  if (!clean) return root;
  const parts =
    clean.match(/[^.[\]]+|\[(\d+)\]/g)?.map((part) => part.replace(/^\[|\]$/g, "")) ?? [];
  let current: unknown = root;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (part === "*") {
      if (Array.isArray(current)) return current.flat();
      if (typeof current === "object") return Object.values(current as Record<string, unknown>);
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function validateSchema(value: unknown, schema: unknown, path = "$", errors: string[] = []) {
  if (!schema || typeof schema !== "object") return errors;
  const rule = schema as Record<string, unknown>;
  if (typeof rule.type === "string") {
    const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    const valid =
      rule.type === actual ||
      (rule.type === "integer" && typeof value === "number" && Number.isInteger(value));
    if (!valid) errors.push(`${path}: expected ${rule.type}, got ${actual}`);
  }
  if (
    Array.isArray(rule.enum) &&
    !rule.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))
  )
    errors.push(`${path}: value is not in enum`);
  if (Array.isArray(rule.required) && value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required)
      if (typeof key === "string" && !(key in (value as Record<string, unknown>)))
        errors.push(`${path}.${key}: required property is missing`);
  }
  if (
    rule.properties &&
    typeof rule.properties === "object" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    for (const [key, subSchema] of Object.entries(rule.properties as Record<string, unknown>)) {
      if (key in (value as Record<string, unknown>))
        validateSchema(
          (value as Record<string, unknown>)[key],
          subSchema,
          `${path}.${key}`,
          errors,
        );
    }
  }
  if (rule.items && Array.isArray(value))
    value.forEach((entry, index) => validateSchema(entry, rule.items, `${path}[${index}]`, errors));
  return errors;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function ToolWorkspace({ slug }: { slug: string }) {
  const [input, setInput] = useState(samples[slug] ?? "");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"input" | "output">("input");
  const [copied, setCopied] = useState(false);
  const [minify, setMinify] = useState(false);
  const [indent, setIndent] = useState<2 | 4>(2);
  const [mode, setMode] = useState("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [pattern, setPattern] = useState("fox");
  const [flags, setFlags] = useState("g");
  const [dialect, setDialect] = useState("postgresql");
  const [direction, setDirection] = useState<"timestamp" | "date">("timestamp");
  const [option, setOption] = useState("upper");
  const [hashAlgo, setHashAlgo] = useState("SHA-256");
  const [baseFrom, setBaseFrom] = useState("10");
  const [baseTo, setBaseTo] = useState("16");
  const [csvDelimiter, setCsvDelimiter] = useState(",");
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [jwtStatus, setJwtStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sample = samples[slug] ?? "";
    setInput(sample);
    setOutput("");
    setError("");
    setTab("input");
    setNextRuns([]);
    setJwtStatus("");
    setMode(slug === "url-parser" ? "parse" : "encode");
    setUrlSafe(false);
    setPattern("fox");
    setFlags("g");
    setDialect("postgresql");
    setDirection("timestamp");
    setOption("upper");
    setHashAlgo("SHA-256");
    setBaseFrom("10");
    setBaseTo("16");
    setCsvDelimiter(",");
    setIndent(2);
    setMinify(false);
  }, [slug]);

  const run = useCallback(async () => {
    setError("");
    setJwtStatus("");
    if (!input.trim()) {
      setOutput("");
      setNextRuns([]);
      return;
    }
    try {
      if (slug === "json-formatter" || slug === "json-to-yaml" || slug === "json-to-typescript") {
        const parsed: unknown = JSON.parse(input);
        if (slug === "json-formatter") setOutput(JSON.stringify(parsed, null, minify ? 0 : indent));
        if (slug === "json-to-yaml") {
          const yaml = await import("js-yaml");
          setOutput(yaml.dump(parsed, { indent: 2, lineWidth: 120 }));
        }
        if (slug === "json-to-typescript") setOutput(jsonToTypescript(parsed));
      } else if (slug === "yaml-to-json") {
        const yaml = await import("js-yaml");
        setOutput(JSON.stringify(yaml.load(input), null, minify ? 0 : indent));
      } else if (slug === "csv-to-json") {
        const papaModule = await import("papaparse");
        const parser = papaModule.default;
        const result = parser.parse<Record<string, unknown>>(input, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimiter: csvDelimiter,
        });
        if (result.errors.length) throw new Error(result.errors[0].message);
        setOutput(JSON.stringify(result.data, null, minify ? 0 : indent));
      } else if (slug === "base64-encode-decode") {
        const clean = input.replace(/\s/g, "");
        let value =
          mode === "encode"
            ? utf8ToBase64(input)
            : base64ToUtf8(
                clean
                  .replace(/-/g, "+")
                  .replace(/_/g, "/")
                  .padEnd(Math.ceil(clean.length / 4) * 4, "="),
              );
        if (urlSafe && mode === "encode")
          value = value.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
        setOutput(value);
      } else if (slug === "jwt-decoder") {
        const parts = input.trim().split(".");
        if (parts.length !== 3) throw new Error("JWT must contain exactly three segments.");
        const header = JSON.parse(decodeJwtPart(parts[0])) as Record<string, unknown>;
        const payload = JSON.parse(decodeJwtPart(parts[1])) as Record<string, unknown>;
        const formatClaim = (value: unknown) =>
          typeof value === "number" ? new Date(value * 1000).toLocaleString() : "—";
        const expiration = typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
        setJwtStatus(
          expiration
            ? `Expires: ${expiration.toLocaleString()} · ${expiration.getTime() < Date.now() ? "expired" : "active"}`
            : "No exp claim",
        );
        setOutput(
          JSON.stringify(
            {
              header,
              payload,
              signature: { present: Boolean(parts[2]), verified: false },
              timestamps: {
                exp: formatClaim(payload.exp),
                iat: formatClaim(payload.iat),
                nbf: formatClaim(payload.nbf),
              },
            },
            null,
            2,
          ),
        );
      } else if (slug === "cron-expression-generator") {
        const cron = input.trim();
        const cronstrueModule = await import("cronstrue");
        const cronstrue = cronstrueModule.default ?? cronstrueModule;
        const description = cronstrue.toString(cron, { use24HourTimeFormat: true });
        const runs = nextCronRuns(cron);
        setNextRuns(runs);
        setOutput(description);
      } else if (slug === "regex-tester") {
        const regex = new RegExp(pattern, flags);
        const matches: Array<Record<string, unknown>> = [];
        if (regex.global || regex.sticky) {
          let match: RegExpExecArray | null;
          while ((match = regex.exec(input)) !== null) {
            matches.push({
              match: match[0],
              index: match.index,
              groups: match.groups ?? null,
              captures: match.slice(1),
            });
            if (match[0] === "") regex.lastIndex += 1;
          }
        } else {
          const match = regex.exec(input);
          if (match)
            matches.push({
              match: match[0],
              index: match.index,
              groups: match.groups ?? null,
              captures: match.slice(1),
            });
        }
        setOutput(JSON.stringify({ count: matches.length, matches }, null, 2));
      } else if (slug === "sql-formatter") {
        const formatter = await import("sql-formatter");
        setOutput(formatter.format(input, { language: dialect as never, keywordCase: "upper" }));
      } else if (slug === "url-parser") {
        if (mode === "parse") {
          const url = new URL(input);
          setOutput(
            JSON.stringify(
              {
                href: url.href,
                protocol: url.protocol,
                username: url.username,
                host: url.host,
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                parameters: Object.fromEntries(url.searchParams.entries()),
              },
              null,
              2,
            ),
          );
        } else if (mode === "encode") setOutput(encodeURIComponent(input));
        else setOutput(decodeURIComponent(input));
      } else if (slug === "timestamp-converter") {
        if (direction === "timestamp") {
          const number = Number(input.trim());
          if (!Number.isFinite(number)) throw new Error("Enter a valid Unix timestamp.");
          setOutput(new Date(number < 1e12 ? number * 1000 : number).toISOString());
        } else {
          const date = new Date(input.trim());
          if (Number.isNaN(date.getTime()))
            throw new Error("Enter a valid date or ISO 8601 timestamp.");
          setOutput(String(Math.floor(date.getTime() / 1000)));
        }
      } else if (slug === "uuid-generator") {
        const count = Number(input.match(/\d+/)?.[0] ?? 5);
        if (count < 1 || count > 100) throw new Error("Choose between 1 and 100 UUIDs.");
        setOutput(Array.from({ length: count }, () => crypto.randomUUID()).join("\n"));
      } else if (slug === "hash-generator") {
        const digest = await crypto.subtle.digest(hashAlgo, new TextEncoder().encode(input));
        setOutput(
          Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""),
        );
      } else if (slug === "html-entity-encoder") {
        const textarea = document.createElement("textarea");
        if (mode === "encode") setOutput(escapeHtml(input));
        else {
          textarea.innerHTML = input;
          setOutput(textarea.value);
        }
      } else if (slug === "number-base-converter") {
        const value =
          baseFrom === "16"
            ? BigInt(`0x${input.trim().replace(/^0x/i, "")}`)
            : baseFrom === "8"
              ? BigInt(`0o${input.trim().replace(/^0o/i, "")}`)
              : baseFrom === "2"
                ? BigInt(`0b${input.trim().replace(/^0b/i, "")}`)
                : BigInt(input.trim());
        const prefix = baseTo === "16" ? "0x" : baseTo === "8" ? "0o" : baseTo === "2" ? "0b" : "";
        setOutput(
          `${prefix}${value.toString(Number(baseTo)).toUpperCase()}\n\nBinary: ${value.toString(2)}\nOctal: ${value.toString(8)}\nDecimal: ${value.toString(10)}\nHex: ${value.toString(16).toUpperCase()}`,
        );
      } else if (slug === "html-formatter") setOutput(formatHtml(input, indent));
      else if (slug === "text-case-converter") setOutput(convertCase(input, option));
      else if (slug === "json-path-tester") {
        const [jsonText, pathText] = input.split(/\n---JSONPATH---\n/i);
        const root = JSON.parse(jsonText);
        const path = pathText?.trim() ?? "";
        const result = getJsonPath(root, path);
        if (result === undefined) throw new Error(`No value found for ${path}`);
        setOutput(JSON.stringify(result, null, indent));
      } else if (slug === "json-schema-validator") {
        const [jsonText, schemaText] = input.split(/\n---SCHEMA---\n/i);
        if (!schemaText)
          throw new Error(
            "Separate the JSON document and schema with a line containing ---SCHEMA---.",
          );
        const errors = validateSchema(JSON.parse(jsonText), JSON.parse(schemaText));
        setOutput(
          errors.length
            ? `INVALID\n\n${errors.join("\n")}`
            : "VALID\n\nThe JSON document matches the supported schema rules.",
        );
      }
    } catch (caught) {
      setOutput("");
      setNextRuns([]);
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(slug.includes("json") ? parseJsonError(message, input) : message);
    }
  }, [
    baseFrom,
    baseTo,
    csvDelimiter,
    dialect,
    direction,
    flags,
    hashAlgo,
    indent,
    input,
    minify,
    mode,
    option,
    pattern,
    slug,
    urlSafe,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 180);
    return () => window.clearTimeout(timer);
  }, [run]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
      if (event.key === "Escape" && document.activeElement?.tagName !== "INPUT") {
        setInput("");
        setOutput("");
        setError("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [run]);

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function downloadOutput() {
    if (!output) return;
    const extension = slug.includes("yaml")
      ? "yaml"
      : slug.includes("typescript")
        ? "ts"
        : slug.includes("sql")
          ? "sql"
          : slug.includes("html")
            ? "html"
            : slug.includes("json") || slug === "jwt-decoder" || slug === "url-parser"
              ? "json"
              : "txt";
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `eldevo-${slug}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const editorLanguage = useMemo(
    () =>
      slug.includes("json") || slug === "jwt-decoder" || slug === "json-schema-validator"
        ? "json"
        : slug === "html-formatter"
          ? "html"
          : slug === "sql-formatter"
            ? "sql"
            : "text",
    [slug],
  );

  const customControls = (
    <div className="flex flex-wrap gap-2 border-b border-slate-800 p-2">
      {slug === "cron-expression-generator" && (
        <>
          <span className="self-center px-1 text-[10px] uppercase tracking-wider text-slate-600">
            Presets
          </span>
          <Button onClick={() => setInput("* * * * *")}>Every minute</Button>
          <Button onClick={() => setInput("*/15 * * * *")}>Every 15m</Button>
          <Button onClick={() => setInput("0 3 * * *")}>Daily 03:00</Button>
          <Button onClick={() => setInput("0 9 * * 1-5")}>Weekdays 09:00</Button>
        </>
      )}
      {slug === "base64-encode-decode" && (
        <>
          <Button active={mode === "encode"} onClick={() => setMode("encode")}>
            Encode
          </Button>
          <Button active={mode === "decode"} onClick={() => setMode("decode")}>
            Decode
          </Button>
          <label className="flex min-h-9 items-center gap-2 px-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(event) => setUrlSafe(event.target.checked)}
            />
            URL-safe
          </label>
        </>
      )}
      {slug === "url-parser" && (
        <>
          <Button active={mode === "parse"} onClick={() => setMode("parse")}>
            Parse
          </Button>
          <Button active={mode === "encode"} onClick={() => setMode("encode")}>
            Encode
          </Button>
          <Button active={mode === "decode"} onClick={() => setMode("decode")}>
            Decode
          </Button>
        </>
      )}
      {slug === "timestamp-converter" && (
        <>
          <Button active={direction === "timestamp"} onClick={() => setDirection("timestamp")}>
            Timestamp → Date
          </Button>
          <Button active={direction === "date"} onClick={() => setDirection("date")}>
            Date → Timestamp
          </Button>
        </>
      )}
      {slug === "hash-generator" && (
        <select
          aria-label="Hash algorithm"
          value={hashAlgo}
          onChange={(event) => setHashAlgo(event.target.value)}
          className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
        >
          <option>SHA-256</option>
          <option>SHA-384</option>
          <option>SHA-512</option>
          <option>SHA-1</option>
        </select>
      )}
      {slug === "number-base-converter" && (
        <>
          <select
            aria-label="Source base"
            value={baseFrom}
            onChange={(event) => setBaseFrom(event.target.value)}
            className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
          >
            <option value="2">From binary</option>
            <option value="8">From octal</option>
            <option value="10">From decimal</option>
            <option value="16">From hex</option>
          </select>
          <ArrowLeftRight className="mt-3 size-3.5 text-slate-500" />
          <select
            aria-label="Target base"
            value={baseTo}
            onChange={(event) => setBaseTo(event.target.value)}
            className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
          >
            <option value="2">To binary</option>
            <option value="8">To octal</option>
            <option value="10">To decimal</option>
            <option value="16">To hex</option>
          </select>
        </>
      )}
      {slug === "text-case-converter" && (
        <select
          aria-label="Text case"
          value={option}
          onChange={(event) => setOption(event.target.value)}
          className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
        >
          <option value="upper">UPPERCASE</option>
          <option value="lower">lowercase</option>
          <option value="title">Title Case</option>
          <option value="camel">camelCase</option>
          <option value="pascal">PascalCase</option>
          <option value="snake">snake_case</option>
          <option value="kebab">kebab-case</option>
        </select>
      )}
      {slug === "regex-tester" && (
        <>
          <input
            aria-label="Regular expression"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Regex pattern"
            className="min-h-9 min-w-40 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
          <input
            aria-label="Regex flags"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            className="min-h-9 w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-xs outline-none focus:border-cyan-500"
          />
        </>
      )}
      {slug === "csv-to-json" && (
        <select
          aria-label="CSV delimiter"
          value={csvDelimiter}
          onChange={(event) => setCsvDelimiter(event.target.value)}
          className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
        >
          <option value=",">Comma</option>
          <option value=";">Semicolon</option>
          <option value="	">Tab</option>
        </select>
      )}
      {slug === "sql-formatter" && (
        <select
          aria-label="SQL dialect"
          value={dialect}
          onChange={(event) => setDialect(event.target.value)}
          className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs"
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="sqlite">SQLite</option>
          <option value="mariadb">MariaDB</option>
          <option value="bigquery">BigQuery</option>
          <option value="transactsql">T-SQL</option>
        </select>
      )}
      {(["json-formatter", "yaml-to-json", "csv-to-json"] as string[]).includes(slug) && (
        <>
          <Button active={indent === 2} onClick={() => setIndent(2)}>
            2 spaces
          </Button>
          <Button active={indent === 4} onClick={() => setIndent(4)}>
            4 spaces
          </Button>
          <Button active={minify} onClick={() => setMinify((value) => !value)}>
            Minify
          </Button>
        </>
      )}
      {slug === "html-formatter" && (
        <>
          <Button active={indent === 2} onClick={() => setIndent(2)}>
            2 spaces
          </Button>
          <Button active={indent === 4} onClick={() => setIndent(4)}>
            4 spaces
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {jwtStatus && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">
          {jwtStatus}
        </div>
      )}
      <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1 md:hidden">
        <button
          onClick={() => setTab("input")}
          className={`min-h-11 flex-1 rounded-lg text-sm ${tab === "input" ? "bg-slate-800 text-cyan-300" : "text-slate-400"}`}
        >
          Input
        </button>
        <button
          onClick={() => setTab("output")}
          className={`min-h-11 flex-1 rounded-lg text-sm ${tab === "output" ? "bg-slate-800 text-cyan-300" : "text-slate-400"}`}
        >
          Output
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel label="Input" hidden={tab !== "input"}>
          <div className="flex flex-wrap gap-2 border-b border-slate-800 p-2">
            <Button onClick={() => setInput(samples[slug] ?? "")}>
              <RefreshCw className="size-3.5" />
              Sample
            </Button>
            <Button
              onClick={() => {
                setInput("");
                setOutput("");
                setError("");
              }}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <FileUp className="size-3.5" />
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setInput);
              }}
            />
          </div>
          {customControls}
          <CodeEditor
            value={input}
            onChange={setInput}
            language={editorLanguage}
            placeholder="Paste or type your data here…"
          />
        </Panel>
        <Panel label="Output" hidden={tab !== "output"}>
          <div className="flex flex-wrap gap-2 border-b border-slate-800 p-2">
            <Button onClick={() => void copyOutput()}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={downloadOutput}>
              <Download className="size-3.5" />
              Download
            </Button>
            <Button onClick={() => void run()}>
              <RefreshCw className="size-3.5" />
              Run
            </Button>
          </div>
          <CodeEditor
            value={output}
            readOnly
            language={editorLanguage}
            placeholder="Your result will appear here…"
          />
        </Panel>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 font-mono text-xs leading-6 text-rose-300"
        >
          {error}
        </div>
      )}
      {slug === "cron-expression-generator" && nextRuns.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold">Next 5 runs</h3>
          <ol className="mt-3 grid gap-2 font-mono text-xs text-slate-400">
            {nextRuns.map((run, index) => (
              <li key={`${run}-${index}`}>
                <span className="mr-3 text-cyan-400">{index + 1}.</span>
                {run}
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="text-[11px] text-slate-600">
        Ctrl/Cmd + Enter to run · Esc to clear · Processing stays in your browser.
      </p>
    </div>
  );
}

function Panel({
  label,
  hidden,
  children,
}: {
  label: string;
  hidden: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`${hidden ? "hidden md:block" : ""} overflow-hidden rounded-xl border border-slate-800 bg-slate-900`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[.2em] text-slate-500">
          {label}
        </span>
        <span className="size-1.5 rounded-full bg-emerald-400" title="Client-side" />
      </div>
      {children}
    </section>
  );
}

function Button({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${active ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}
    >
      {children}
    </button>
  );
}
