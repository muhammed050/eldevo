"use client";

import { useEffect, useMemo, useState } from "react";

const prettify = (value: unknown) => JSON.stringify(value, null, 2);
const escapeHtml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const numbers = (s: string) =>
  s
    .split(/[,\s]+/)
    .map(Number)
    .filter(Number.isFinite);

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortJson(v)]),
    );
  return value;
}

function jsonToTs(value: unknown, name = "Root"): string {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return `type ${name} = ${Array.isArray(value) ? "unknown[]" : typeof value};`;
  const fields = Object.entries(value).map(([key, val]) => {
    const type = Array.isArray(val)
      ? "unknown[]"
      : val === null
        ? "null"
        : typeof val === "object"
          ? "Record<string, unknown>"
          : typeof val;
    return `  ${/^[$A-Z_a-z][$\w]*$/.test(key) ? key : JSON.stringify(key)}: ${type};`;
  });
  return `export interface ${name} {\n${fields.join("\n")}\n}`;
}

function jsonToCsv(value: unknown): string {
  if (!Array.isArray(value) || !value.length || typeof value[0] !== "object")
    throw new Error("Enter a JSON array of objects.");
  const rows = value as Record<string, unknown>[];
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    keys.map(cell).join(","),
    ...rows.map((row) => keys.map((key) => cell(row[key])).join(",")),
  ].join("\n");
}

function jsonToXml(value: unknown, root = "root"): string {
  if (value === null || typeof value !== "object")
    return `<${root}>${escapeHtml(String(value ?? ""))}</${root}>`;
  if (Array.isArray(value)) return value.map((item) => jsonToXml(item, "item")).join("");
  return `<${root}>${Object.entries(value)
    .map(([key, val]) => jsonToXml(val, key.replace(/[^\w-]/g, "_")))
    .join("")}</${root}>`;
}

function xmlToJson(input: string): string {
  const doc = new DOMParser().parseFromString(input, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XML.");
  const walk = (element: Element): unknown => {
    const children = [...element.children];
    if (!children.length) return element.textContent ?? "";
    const out: Record<string, unknown> = {};
    for (const child of children) {
      const value = walk(child);
      if (child.tagName in out)
        out[child.tagName] = Array.isArray(out[child.tagName])
          ? [...(out[child.tagName] as unknown[]), value]
          : [out[child.tagName], value];
      else out[child.tagName] = value;
    }
    return out;
  };
  return prettify({ [doc.documentElement.tagName]: walk(doc.documentElement) });
}

function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64Decode(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}
function hexEncode(value: string) {
  return [...new TextEncoder().encode(value)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function hexDecode(value: string) {
  const clean = value.replace(/[^0-9a-f]/gi, "");
  return new TextDecoder().decode(
    Uint8Array.from(clean.match(/.{1,2}/g) ?? [], (x) => parseInt(x, 16)),
  );
}
function randomString(length: number, safe = false) {
  const chars = safe
    ? "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}
function regexTest(input: string) {
  const [pattern, flags = "", text = ""] = input.split(/\n---TEST---\n/i);
  const re = new RegExp(pattern, flags);
  return prettify(
    [...text.matchAll(re)].map((m) => ({ match: m[0], index: m.index, groups: m.groups ?? {} })),
  );
}
function minifyCss(input: string) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .trim();
}
function minifyHtml(input: string) {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}
function minifyJs(input: string) {
  return input
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:=+*<>])\s*/g, "$1")
    .trim();
}
function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function ratio(input: string) {
  const [a, b] = numbers(input);
  if (!a || !b) throw new Error("Enter two positive numbers.");
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : Math.abs(x));
  const d = gcd(a, b);
  return `${a / d}:${b / d}`;
}
function average(input: string) {
  const a = numbers(input);
  if (!a.length) throw new Error("Enter numbers separated by spaces or commas.");
  return String(a.reduce((x, y) => x + y, 0) / a.length);
}
function median(input: string) {
  const a = numbers(input).sort((x, y) => x - y);
  if (!a.length) throw new Error("Enter numbers separated by spaces or commas.");
  return String(a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
}
function seoTags(input: string) {
  const [title = "", description = "", url = ""] = input.split(/\r?\n/);
  return `<title>${escapeHtml(title)}</title>\n<meta name="description" content="${escapeHtml(description)}">\n<link rel="canonical" href="${escapeHtml(url)}">`;
}
function schema(input: string, type: string) {
  const [name = "", url = "", description = ""] = input.split(/\r?\n/);
  return prettify({ "@context": "https://schema.org", "@type": type, name, url, description });
}
function httpStatus(input: string) {
  const code = Number(input.trim());
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    409: "Conflict",
    422: "Unprocessable Content",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return map[code] ? `${code} ${map[code]}` : "Unknown HTTP status code.";
}
function queryParse(input: string) {
  const url = new URL(
    input.includes("?") ? input : `https://example.com/?${input.replace(/^\?/, "")}`,
  );
  return prettify(Object.fromEntries(url.searchParams.entries()));
}
function queryGenerate(input: string) {
  const value = JSON.parse(input) as Record<string, unknown>;
  return new URLSearchParams(Object.entries(value).map(([k, v]) => [k, String(v)])).toString();
}
function domainParse(input: string) {
  const url = new URL(input.includes("://") ? input : `https://${input.trim()}`);
  return prettify({
    hostname: url.hostname,
    protocol: url.protocol,
    port: url.port || null,
    pathname: url.pathname,
  });
}
function textStats(input: string) {
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const sentences = input.trim() ? input.match(/[.!?]+(?=\s|$)/g)?.length || 1 : 0;
  return prettify({
    words,
    characters: input.length,
    charactersWithoutSpaces: input.replace(/\s/g, "").length,
    sentences,
    paragraphs: input.trim() ? input.split(/\n\s*\n/).length : 0,
    readingTimeMinutes: Math.max(1, Math.ceil(words / 200)),
  });
}

async function transform(slug: string, input: string): Promise<string> {
  switch (slug) {
    case "json-beautifier":
    case "json-viewer":
      return prettify(JSON.parse(input));
    case "json-minifier":
      return JSON.stringify(JSON.parse(input));
    case "json-validator":
      JSON.parse(input);
      return "Valid JSON";
    case "json-sorter":
      return prettify(sortJson(JSON.parse(input)));
    case "json-escape":
      return JSON.stringify(input).slice(1, -1);
    case "json-unescape":
      return JSON.parse(`"${input}"`);
    case "json-to-csv":
      return jsonToCsv(JSON.parse(input));
    case "json-to-xml":
      return jsonToXml(JSON.parse(input));
    case "xml-to-json":
      return xmlToJson(input);
    case "json-to-javascript":
      return `const data = ${prettify(JSON.parse(input))};`;
    case "json-to-typescript-interface":
      return jsonToTs(JSON.parse(input));
    case "json-schema-generator":
      return prettify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: Object.fromEntries(Object.keys(JSON.parse(input)).map((key) => [key, {}])),
      });
    case "jsonpath-tester": {
      const [json, path] = input.split(/\n---PATH---\n/i);
      const value = JSON.parse(json);
      if (path?.trim() === "$" || path?.trim() === "") return prettify(value);
      const keys = path
        .trim()
        .replace(/^\$\.?/, "")
        .split(".")
        .filter(Boolean);
      let current: unknown = value;
      for (const key of keys) current = (current as Record<string, unknown>)?.[key];
      return prettify(current);
    }
    case "base64-encoder":
      return base64Encode(input);
    case "base64-decoder":
      return base64Decode(input);
    case "url-encoder":
      return encodeURIComponent(input);
    case "url-decoder":
      return decodeURIComponent(input);
    case "html-encoder":
      return escapeHtml(input);
    case "html-decoder": {
      const el = document.createElement("textarea");
      el.innerHTML = input;
      return el.value;
    }
    case "unicode-escape":
      return [...input].map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join("");
    case "unicode-decoder":
      return input.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    case "hex-encoder":
      return hexEncode(input);
    case "hex-decoder":
      return hexDecode(input);
    case "binary-to-text":
      return hexDecode(
        input
          .trim()
          .split(/\s+/)
          .map((x) => parseInt(x, 2).toString(16).padStart(2, "0"))
          .join(""),
      );
    case "text-to-binary":
      return [...new TextEncoder().encode(input)]
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" ");
    case "ascii-converter":
      return [...input].map((c) => `${c}: ${c.charCodeAt(0)}`).join("\n");
    case "word-counter":
    case "character-counter":
    case "sentence-counter":
    case "reading-time-calculator":
      return textStats(input);
    case "remove-duplicate-lines":
      return [...new Set(input.split(/\r?\n/))].join("\n");
    case "sort-lines":
      return input
        .split(/\r?\n/)
        .sort((a, b) => a.localeCompare(b))
        .join("\n");
    case "reverse-text":
      return [...input].reverse().join("");
    case "remove-extra-spaces":
      return input
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    case "remove-empty-lines":
      return input
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .join("\n");
    case "text-diff":
    case "text-compare": {
      const [left, right] = input.split(/\n---DIFF---\n/i);
      return left === right ? "No differences." : `Left:\n${left}\n\nRight:\n${right}`;
    }
    case "slug-generator":
      return slugify(input);
    case "random-number-generator":
      return String(Math.floor(Math.random() * 1000000));
    case "random-string-generator":
      return randomString(24);
    case "password-generator":
      return randomString(24, true);
    case "uuid-generator-v4":
      return crypto.randomUUID();
    case "api-key-generator":
      return `eld_${randomString(40, true)}`;
    case "secret-key-generator":
      return randomString(48, true);
    case "timestamp-generator":
      return String(Math.floor(Date.now() / 1000));
    case "email-extractor":
      return [...new Set(input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join("\n");
    case "url-extractor":
      return [...new Set(input.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])].join("\n");
    case "http-status-code-checker":
      return httpStatus(input);
    case "query-string-parser":
      return queryParse(input);
    case "query-string-generator":
      return queryGenerate(input);
    case "domain-parser":
      return domainParse(input);
    case "regex-escape":
      return input.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    case "regex-tester":
    case "email-regex-tester":
    case "url-regex-tester":
      return regexTest(input);
    case "html-minifier":
      return minifyHtml(input);
    case "css-minifier":
      return minifyCss(input);
    case "javascript-minifier":
      return minifyJs(input);
    case "css-formatter":
      return input
        .replace(/\s*([{}:;,])\s*/g, "$1")
        .replace(/}/g, "}\n")
        .replace(/{/g, " {\n")
        .replace(/;/g, ";\n");
    case "javascript-formatter":
      return input.replace(/\{/g, " {\n  ").replace(/;/g, ";\n").replace(/}/g, "\n}");
    case "css-gradient-generator":
      return `background: linear-gradient(135deg, #06b6d4, #6366f1);`;
    case "css-box-shadow-generator":
      return `box-shadow: 0 10px 30px rgba(0,0,0,0.18);`;
    case "css-border-radius-generator":
      return `border-radius: 12px;`;
    case "css-flexbox-generator":
      return `.container { display: flex; justify-content: center; align-items: center; gap: 1rem; }`;
    case "css-grid-generator":
      return `.container { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }`;
    case "meta-tag-generator":
      return seoTags(input);
    case "open-graph-generator":
      return `<meta property="og:title" content="${escapeHtml(input.split(/\n/)[0] ?? "")}">\n<meta property="og:description" content="${escapeHtml(input.split(/\n/)[1] ?? "")}">`;
    case "twitter-card-generator":
      return `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${escapeHtml(input.split(/\n/)[0] ?? "")}">`;
    case "schema-markup-generator":
      return schema(input, "WebPage");
    case "faq-schema-generator":
      return prettify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: input.split(/\n/)[0] ?? "Question",
            acceptedAnswer: { "@type": "Answer", text: input.split(/\n/)[1] ?? "Answer" },
          },
        ],
      });
    case "article-schema-generator":
      return schema(input, "Article");
    case "breadcrumb-schema-generator":
      return schema(input, "BreadcrumbList");
    case "canonical-url-generator":
      return `<link rel="canonical" href="${escapeHtml(input.trim())}">`;
    case "robots-txt-generator":
      return "User-agent: *\nAllow: /\n\nSitemap: https://eldevo.com/sitemap.xml";
    case "sitemap-generator":
      return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeHtml(input.trim() || "https://eldevo.com/")}</loc></url>\n</urlset>`;
    case "percentage-calculator": {
      const n = Number(input);
      if (!Number.isFinite(n)) throw new Error("Enter a number.");
      return `${n}% = ${n / 100}`;
    }
    case "percentage-change-calculator": {
      const [oldValue, newValue] = numbers(input);
      return `${(((newValue - oldValue) / oldValue) * 100).toFixed(2)}%`;
    }
    case "ratio-calculator":
      return ratio(input);
    case "average-calculator":
      return average(input);
    case "median-calculator":
      return median(input);
    case "standard-deviation-calculator": {
      const a = numbers(input);
      const avg = a.reduce((x, y) => x + y, 0) / a.length;
      return String(Math.sqrt(a.reduce((x, y) => x + (y - avg) ** 2, 0) / a.length));
    }
    case "age-calculator": {
      const date = new Date(input.trim());
      if (Number.isNaN(+date)) throw new Error("Enter a valid birth date.");
      const now = new Date();
      return String(
        now.getFullYear() -
          date.getFullYear() -
          (now < new Date(now.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0),
      );
    }
    case "date-difference-calculator": {
      const [a, b] = input.split(/\s*to\s*|\n/).map((x) => new Date(x));
      if (Number.isNaN(+a) || Number.isNaN(+b))
        throw new Error("Enter two dates separated by 'to'.");
      return `${Math.abs(+b - +a) / 86400000} days`;
    }
    case "time-duration-calculator": {
      const [a, b] = numbers(input);
      return `${Math.abs(b - a)} minutes`;
    }
    case "simple-interest-calculator": {
      const [p, r, t] = numbers(input);
      return String((p * r * t) / 100);
    }
    case "compound-interest-calculator": {
      const [p, r, n] = numbers(input);
      return String(p * Math.pow(1 + r / 100, n));
    }
    case "discount-calculator": {
      const [price, discount] = numbers(input);
      return String(price * (1 - discount / 100));
    }
    case "profit-margin-calculator": {
      const [revenue, cost] = numbers(input);
      return `${(((revenue - cost) / revenue) * 100).toFixed(2)}%`;
    }
    case "markup-calculator": {
      const [cost, sale] = numbers(input);
      return `${(((sale - cost) / cost) * 100).toFixed(2)}%`;
    }
    case "break-even-calculator": {
      const [fixed, contribution] = numbers(input);
      return String(fixed / contribution);
    }
    case "gitignore-generator":
      return `node_modules/\n.next/\nout/\n.env\n.env.local\n.DS_Store\n*.log`;
    case "env-generator":
      return input
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => `${line.trim().replace(/\s+/g, "_").toUpperCase()}=`)
        .join("\n");
    case "dockerfile-generator":
      return `FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["npm", "start"]`;
    case "docker-compose-generator":
      return `services:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    restart: unless-stopped`;
    case "lorem-ipsum-generator":
      return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    case "color-picker":
    case "hex-color-converter":
    case "rgb-to-hex":
    case "hex-to-rgb":
      return input.trim();
    case "user-agent-parser": {
      const ua = input || navigator.userAgent;
      return prettify({
        userAgent: ua,
        mobile: /Mobi|Android/i.test(ua),
        chrome: /Chrome/i.test(ua),
        firefox: /Firefox/i.test(ua),
        safari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
      });
    }
    default:
      throw new Error(
        "This tool needs a dedicated input mode and is not enabled yet. It will not return a fake result.",
      );
  }
}

export function StrategicToolWorkspaceV2({ slug }: { slug: string }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const placeholder = useMemo(
    () =>
      slug.includes("calculator")
        ? "Numbers separated by spaces or commas…"
        : slug.includes("diff") || slug.includes("compare")
          ? "Left text\n---DIFF---\nRight text"
          : "Paste or type your input here…",
    [slug],
  );
  useEffect(() => {
    setInput("");
    setOutput("");
    setError("");
  }, [slug]);
  async function run() {
    setRunning(true);
    setError("");
    try {
      setOutput(await transform(slug, input));
    } catch (error) {
      setOutput("");
      setError(error instanceof Error ? error.message : "Unable to process input.");
    } finally {
      setRunning(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">
            Input
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">
            Output
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Your result will appear here…"
            className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none"
          />
        </section>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-300"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {running ? "Running…" : "Run tool"}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          disabled={!output}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          Copy result
        </button>
        <button
          onClick={() => {
            setInput("");
            setOutput("");
            setError("");
          }}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Clear
        </button>
      </div>
      <p className="text-xs text-slate-600">
        Client-side processing · No signup · Your input stays in your browser.
      </p>
    </div>
  );
}
