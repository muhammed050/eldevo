"use client";

import { useEffect, useMemo, useState } from "react";

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const nums = (s: string) =>
  s
    .split(/[,\s]+/)
    .map(Number)
    .filter(Number.isFinite);

const lines = (s: string) => s.split(/\r?\n/);

const rand = (length: number, safe = false) => {
  const chars = safe
    ? "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => chars[byte % chars.length]).join("");
};

const parseJson = (value: string): unknown => JSON.parse(value);

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }
  return value;
};

const base64Encode = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64Decode = (value: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(value.replace(/\s/g, "")), (char) => char.charCodeAt(0)),
  );

const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hexBytes = (value: string) =>
  Uint8Array.from(
    value.replace(/[^0-9a-f]/gi, "").match(/.{1,2}/g) ?? [],
    (item) => parseInt(item, 16),
  );

const sha = async (value: string, algorithm: "SHA-256" | "SHA-512") =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest(
        algorithm,
        new TextEncoder().encode(value),
      ),
    ),
  );

const splitMarker = (value: string, marker: string) => {
  const parts = value.split(new RegExp(`\\n${marker}\\n`, "i"));
  return [parts[0] ?? "", parts.slice(1).join(`\n${marker}\n`)];
};

const simpleDiff = (value: string) => {
  const [left, right] = splitMarker(value, "---DIFF---");
  if (!right) return "Separate the two values with ---DIFF---.";
  if (left === right) return "No differences.";
  return `Left:\n${left}\n\nRight:\n${right}`;
};

const xmlToJson = (value: string) => {
  const document = new DOMParser().parseFromString(value, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("Invalid XML.");

  const walk = (element: Element): unknown => {
    const children = [...element.children];
    if (!children.length) return element.textContent ?? "";

    const result: Record<string, unknown> = {};
    for (const child of children) {
      const childValue = walk(child);
      const current = result[child.tagName];
      result[child.tagName] =
        current === undefined
          ? childValue
          : Array.isArray(current)
            ? [...current, childValue]
            : [current, childValue];
    }
    return result;
  };

  return JSON.stringify(
    { [document.documentElement.tagName]: walk(document.documentElement) },
    null,
    2,
  );
};

const jsonToXml = (value: unknown, root = "root"): string => {
  if (value === null || typeof value !== "object") {
    return `<${root}>${esc(String(value ?? ""))}</${root}>`;
  }
  if (Array.isArray(value)) return value.map((item) => jsonToXml(item, "item")).join("");

  return `<${root}>${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => jsonToXml(item, key.replace(/[^\w-]/g, "_")))
    .join("")}</${root}>`;
};

const jsonToTypeScript = (value: unknown, name = "Root") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Enter a JSON object.");
  }

  const typeOf = (item: unknown): string => {
    if (Array.isArray(item)) return `${item.length ? typeOf(item[0]) : "unknown"}[]`;
    if (item && typeof item === "object") return "Record<string, unknown>";
    if (item === null) return "null";
    return typeof item;
  };

  const body = Object.entries(value as Record<string, unknown>)
    .map(
      ([key, item]) =>
        `  ${/^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? key : JSON.stringify(key)}: ${typeOf(item)};`,
    )
    .join("\n");

  return `export interface ${name} {\n${body}\n}`;
};

const schema = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return { type: "array", items: value.length ? schema(value[0]) : {} };
  }
  if (value && typeof value === "object") {
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, schema(item)]),
      ),
    };
  }
  if (value === null) return { type: "null" };
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "number") return { type: "number" };
  if (typeof value === "boolean") return { type: "boolean" };
  return {};
};

const jsonPath = (value: string) => {
  const [jsonText, path] = splitMarker(value, "---PATH---");
  const data = parseJson(jsonText);
  if (!path.trim()) return JSON.stringify(data, null, 2);

  const tokens = path
    .trim()
    .replace(/^\$\.?/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = data;
  for (const token of tokens) {
    if (current === null || current === undefined) break;
    if (typeof current !== "object") {
      current = undefined;
      break;
    }
    current = (current as Record<string, unknown>)[token];
  }

  return JSON.stringify(current, null, 2);
};

const jwtGenerate = (value: string) => {
  let payload: Record<string, unknown> = {
    sub: "1234567890",
    name: "ElDevo User",
    iat: Math.floor(Date.now() / 1000),
  };
  if (value.trim()) {
    const parsed = parseJson(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JWT payload must be a JSON object.");
    }
    payload = parsed as Record<string, unknown>;
  }
  return `${base64Encode(JSON.stringify({ alg: "none", typ: "JWT" })).replaceAll("=", "")}.${base64Encode(JSON.stringify(payload)).replaceAll("=", "")}.`;
};

const hmac = async (value: string) => {
  const [message, secret] = splitMarker(value, "---KEY---");
  if (!message || !secret) {
    throw new Error("Enter message, then ---KEY---, then the secret key.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return hex(new Uint8Array(signature));
};

const regexEscape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regexGenerate = (value: string) => `/${regexEscape(value.trim())}/g`;

const regexTest = (value: string, expression: RegExp) =>
  expression.test(value.trim()) ? "Match: valid" : "No match: invalid";

const htmlValidate = (value: string) => {
  if (!value.trim()) throw new Error("Enter HTML first.");
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.documentElement ? "HTML parsed successfully." : "Invalid HTML.";
};

const htmlToMarkdown = (value: string) =>
  value
    .replace(/<h([1-6])>(.*?)<\/h\1>/gis, (_, level, text) => `${"#".repeat(Number(level))} ${text}\n`)
    .replace(/<strong>(.*?)<\/strong>/gis, "**$1**")
    .replace(/<em>(.*?)<\/em>/gis, "*$1*")
    .replace(/<p>(.*?)<\/p>/gis, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();

const markdownToHtml = (value: string) =>
  value
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .split(/\n\s*\n/)
    .map((part) => (/^<h[1-3]>/.test(part.trim()) ? part.trim() : `<p>${part.trim()}</p>`))
    .join("\n");

const cssFormat = (value: string) =>
  value
    .replace(/\s*\{\s*/g, " {\n  ")
    .replace(/;\s*/g, ";\n  ")
    .replace(/\s*\}/g, "\n}")
    .replace(/\n\s*\n/g, "\n")
    .trim();

const jsFormat = (value: string) =>
  value
    .replace(/\s*\{\s*/g, " {\n  ")
    .replace(/;\s*/g, ";\n  ")
    .replace(/\s*\}/g, "\n}")
    .trim();

const cron = (value: string) => {
  const fields = value.trim().split(/\s+/);
  if (fields.length < 5) throw new Error("Enter 5 cron fields: minute hour day month weekday.");
  return [
    `Minute: ${fields[0]}`,
    `Hour: ${fields[1]}`,
    `Day: ${fields[2]}`,
    `Month: ${fields[3]}`,
    `Weekday: ${fields[4]}`,
  ].join("\n");
};

const httpStatus = (value: string) => {
  const code = Number(value.trim());
  const names: Record<number, string> = {
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
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return names[code] ? `${code} ${names[code]}` : "Enter a valid HTTP status code.";
};

const queryParse = (value: string) => {
  const url = new URL(value.includes("?") ? value : `https://example.com/?${value.replace(/^\?/, "")}`);
  return JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2);
};

const queryGenerate = (value: string) => {
  const data = parseJson(value);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Enter a JSON object of query parameters.");
  }
  return new URLSearchParams(
    Object.entries(data as Record<string, unknown>).map(([key, item]) => [key, String(item)]),
  ).toString();
};

const domain = (value: string) => {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return JSON.stringify(
    {
      hostname: url.hostname,
      protocol: url.protocol,
      port: url.port || null,
      path: url.pathname,
    },
    null,
    2,
  );
};

const ratio = (value: string) => {
  const values = nums(value);
  if (values.length < 2) throw new Error("Enter two numbers.");
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
  const divisor = gcd(values[0], values[1]);
  if (!divisor) throw new Error("Numbers cannot both be zero.");
  return `${values[0] / divisor}:${values[1] / divisor}`;
};

const median = (value: string) => {
  const values = nums(value).sort((a, b) => a - b);
  if (!values.length) throw new Error("Enter at least one number.");
  const middle = Math.floor(values.length / 2);
  return String(values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2);
};

const standardDeviation = (value: string) => {
  const values = nums(value);
  if (!values.length) throw new Error("Enter at least one number.");
  const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
  return String(Math.sqrt(values.reduce((sum, item) => sum + (item - mean) ** 2, 0) / values.length));
};

const age = (value: string) => {
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) throw new Error("Enter a valid birth date.");
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years -= 1;
  }
  return String(years);
};

const dateDifference = (value: string) => {
  const [first, second] = value.split(/\s+to\s+|\n/i);
  const start = new Date(first);
  const end = new Date(second);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Enter two dates separated by 'to'.");
  }
  return `${Math.abs(end.getTime() - start.getTime()) / 86_400_000} days`;
};

const meta = (value: string) => {
  const [title = "", description = "", url = ""] = lines(value);
  return `<title>${esc(title)}</title>\n<meta name="description" content="${esc(description)}">\n<link rel="canonical" href="${esc(url)}">`;
};

const openGraph = (value: string) => {
  const [title = "", description = "", url = ""] = lines(value);
  return `<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(description)}">\n<meta property="og:url" content="${esc(url)}">`;
};

const twitter = (value: string) => {
  const [title = "", description = ""] = lines(value);
  return `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${esc(title)}">\n<meta name="twitter:description" content="${esc(description)}">`;
};

const genericSchema = (slug: string, value: string) => {
  const type = slug.includes("article") ? "Article" : slug.includes("breadcrumb") ? "BreadcrumbList" : "WebPage";
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": type,
      name: value || "Example",
      url: value || "https://example.com",
    },
    null,
    2,
  );
};

const faqSchema = (value: string) => {
  const blocks = value.split(/\n---FAQ---\n/i).filter(Boolean);
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: blocks.map((block, index) => {
        const [question = `Question ${index + 1}`, ...answer] = lines(block);
        return {
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer.join("\n") || "Answer",
          },
        };
      }),
    },
    null,
    2,
  );
};

const serp = (value: string) => {
  const [title = "", description = "", url = ""] = lines(value);
  return `Title (${title.length}/60): ${title.slice(0, 60)}\nDescription (${description.length}/160): ${description.slice(0, 160)}\nURL: ${url}`;
};

const density = (value: string) => {
  const [text, keyword] = splitMarker(value, "---KEYWORD---");
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const target = keyword.trim().toLowerCase();
  if (!target) throw new Error("Separate text and keyword with ---KEYWORD---.");
  const count = words.filter((word) => word.replace(/[^\w-]/g, "") === target).length;
  return `Keyword: ${target}\nOccurrences: ${count}\nWords: ${words.length}\nDensity: ${words.length ? ((count / words.length) * 100).toFixed(2) : "0.00"}%`;
};

const headings = (value: string) => {
  const found = [...value.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gis)];
  return found.length
    ? found.map((match) => `H${match[1]}: ${match[2].replace(/<[^>]+>/g, "")}`).join("\n")
    : "No HTML headings found.";
};

const links = (value: string) => {
  const hrefs = [...value.matchAll(/href=["']([^"']+)/gi)].map((match) => match[1]);
  return `Links found: ${(value.match(/<a\b/gi) || []).length}\nUnique hrefs: ${new Set(hrefs).size}`;
};

const rgbHex = (value: string) => {
  const values = nums(value);
  if (values.length < 3) throw new Error("Use RGB values such as 255,128,0.");
  return `#${values
    .slice(0, 3)
    .map((item) => Math.max(0, Math.min(255, Math.round(item))).toString(16).padStart(2, "0"))
    .join("")}`;
};

const hexRgb = (value: string) => {
  const hexValue = value.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hexValue)) {
    throw new Error("Enter a valid 3- or 6-digit hexadecimal color.");
  }
  const expanded = hexValue.length === 3 ? [...hexValue].map((char) => char + char).join("") : hexValue;
  return `rgb(${parseInt(expanded.slice(0, 2), 16)}, ${parseInt(expanded.slice(2, 4), 16)}, ${parseInt(expanded.slice(4, 6), 16)})`;
};

async function transform(slug: string, value: string): Promise<string> {
  switch (slug) {
    case "json-beautifier":
    case "json-formatter":
    case "json-viewer":
      return JSON.stringify(parseJson(value), null, 2);
    case "json-minifier":
      return JSON.stringify(parseJson(value));
    case "json-validator":
      parseJson(value);
      return "Valid JSON";
    case "json-sorter":
      return JSON.stringify(sortJson(parseJson(value)), null, 2);
    case "json-escape":
      return JSON.stringify(value).slice(1, -1);
    case "json-unescape":
      return JSON.parse(`"${value}"`);
    case "json-diff":
      return simpleDiff(value);
    case "json-to-csv": {
      const data = parseJson(value);
      if (!Array.isArray(data) || !data.length || data.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
        throw new Error("Enter a JSON array of objects.");
      }
      const keys = [...new Set(data.flatMap((item) => Object.keys(item as Record<string, unknown>)))];
      const rows = data.map((item) =>
        keys.map((key) => JSON.stringify((item as Record<string, unknown>)[key] ?? "")).join(","),
      );
      return [keys.join(","), ...rows].join("\n");
    }
    case "json-to-xml":
      return jsonToXml(parseJson(value));
    case "xml-to-json":
      return xmlToJson(value);
    case "json-to-javascript":
      return `const data = ${JSON.stringify(parseJson(value), null, 2)};`;
    case "json-to-typescript-interface":
      return jsonToTypeScript(parseJson(value));
    case "jsonpath-tester":
      return jsonPath(value);
    case "json-schema-generator":
      return JSON.stringify(schema(parseJson(value)), null, 2);
    case "base64-encoder":
      return base64Encode(value);
    case "base64-decoder":
      return base64Decode(value);
    case "url-encoder":
      return encodeURIComponent(value);
    case "url-decoder":
      return decodeURIComponent(value);
    case "html-encoder":
      return esc(value);
    case "html-decoder": {
      const element = document.createElement("textarea");
      element.innerHTML = value;
      return element.value;
    }
    case "unicode-escape":
      return [...value].map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).join("");
    case "unicode-decoder":
      return value.replace(/\\u([0-9a-f]{4})/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
    case "hex-encoder":
      return hex(new TextEncoder().encode(value));
    case "hex-decoder":
      return new TextDecoder().decode(hexBytes(value));
    case "binary-to-text":
      return new TextDecoder().decode(
        Uint8Array.from(value.trim().split(/\s+/), (item) => {
          const number = Number.parseInt(item, 2);
          if (!Number.isInteger(number) || number < 0 || number > 255) throw new Error("Invalid binary byte.");
          return number;
        }),
      );
    case "text-to-binary":
      return [...new TextEncoder().encode(value)].map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
    case "ascii-converter":
      return [...value].map((char) => `${char}: ${char.charCodeAt(0)}`).join("\n");
    case "jwt-generator":
      return jwtGenerate(value);
    case "password-generator":
      return rand(24, true);
    case "random-string-generator":
      return rand(24);
    case "uuid-generator-v4":
      return crypto.randomUUID();
    case "api-key-generator":
      return `eld_${rand(40, true)}`;
    case "secret-key-generator":
      return rand(64, true);
    case "md5-generator":
      throw new Error("MD5 is not available through the browser Web Crypto API. Use SHA-256 or SHA-512 for modern security.");
    case "sha256-generator":
      return sha(value, "SHA-256");
    case "sha512-generator":
      return sha(value, "SHA-512");
    case "hmac-generator":
      return hmac(value);
    case "regex-generator":
      return regexGenerate(value);
    case "regex-explainer":
      return [...value].map((char, index) => `${index + 1}. ${char}`).join("\n") || "Enter a regex pattern.";
    case "regex-escape":
      return regexEscape(value);
    case "email-regex-tester":
      return regexTest(value, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    case "url-regex-tester":
      return regexTest(value, /^https?:\/\/[^\s]+$/i);
    case "html-minifier":
      return value.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").trim();
    case "html-validator":
      return htmlValidate(value);
    case "html-to-markdown":
      return htmlToMarkdown(value);
    case "markdown-to-html":
      return markdownToHtml(value);
    case "css-formatter":
      return cssFormat(value);
    case "css-minifier":
      return value
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,])\s*/g, "$1")
        .trim();
    case "css-gradient-generator":
      return "background: linear-gradient(135deg, #06b6d4, #8b5cf6);";
    case "css-box-shadow-generator":
      return "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);";
    case "css-border-radius-generator":
      return "border-radius: 16px;";
    case "css-flexbox-generator":
      return ".container {\n  display: flex;\n  gap: 16px;\n  justify-content: center;\n  align-items: center;\n}";
    case "css-grid-generator":
      return ".container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}";
    case "javascript-formatter":
      return jsFormat(value);
    case "javascript-minifier":
      return value.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").trim();
    case "javascript-escape":
      return JSON.stringify(value);
    case "cron-parser":
    case "cron-humanizer":
      return cron(value);
    case "http-status-code-checker":
      return httpStatus(value);
    case "user-agent-parser":
      return JSON.stringify(
        {
          browser: value.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] ?? "Unknown",
          os: value.match(/(Windows|Mac OS X|Android|iPhone|Linux)/i)?.[1] ?? "Unknown",
          mobile: /Mobile|Android|iPhone/i.test(value),
        },
        null,
        2,
      );
    case "query-string-parser":
      return queryParse(value);
    case "query-string-generator":
      return queryGenerate(value);
    case "domain-parser":
      return domain(value);
    case "email-extractor":
      return [...new Set(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join("\n");
    case "url-extractor":
      return [...new Set(value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])].join("\n");
    case "word-counter": {
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      return `Words: ${words}\nCharacters: ${value.length}`;
    }
    case "character-counter":
      return String(value.length);
    case "sentence-counter":
      return String(value.trim() ? value.match(/[.!?]+(?=\s|$)/g)?.length ?? 1 : 0);
    case "reading-time-calculator": {
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      return `${Math.max(1, Math.ceil(words / 200))} minute(s)`;
    }
    case "remove-duplicate-lines":
      return [...new Set(lines(value))].join("\n");
    case "sort-lines":
      return lines(value).sort((a, b) => a.localeCompare(b)).join("\n");
    case "reverse-text":
      return [...value].reverse().join("");
    case "remove-extra-spaces":
      return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    case "remove-empty-lines":
      return lines(value).filter((line) => line.trim()).join("\n");
    case "text-diff":
    case "text-compare":
      return simpleDiff(value);
    case "slug-generator":
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/gi, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    case "lorem-ipsum-generator":
      return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    case "random-number-generator":
      return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000);
    case "timestamp-generator":
      return String(Math.floor(Date.now() / 1000));
    case "meta-tag-generator":
      return meta(value);
    case "open-graph-generator":
      return openGraph(value);
    case "twitter-card-generator":
      return twitter(value);
    case "schema-markup-generator":
    case "article-schema-generator":
    case "breadcrumb-schema-generator":
      return genericSchema(slug, value);
    case "faq-schema-generator":
      return faqSchema(value);
    case "canonical-url-generator":
      return `<link rel="canonical" href="${esc(value.trim())}" />`;
    case "serp-snippet-preview":
      return serp(value);
    case "keyword-density-checker":
      return density(value);
    case "heading-analyzer":
      return headings(value);
    case "internal-link-analyzer":
      return links(value);
    case "percentage-calculator": {
      const [number, percentage] = nums(value);
      if (!Number.isFinite(number) || !Number.isFinite(percentage)) throw new Error("Enter number and percentage.");
      return String((number * percentage) / 100);
    }
    case "percentage-change-calculator": {
      const [oldValue, newValue] = nums(value);
      if (!Number.isFinite(oldValue) || !Number.isFinite(newValue) || oldValue === 0) throw new Error("Enter two values; the first cannot be zero.");
      return `${(((newValue - oldValue) / oldValue) * 100).toFixed(2)}%`;
    }
    case "ratio-calculator":
      return ratio(value);
    case "average-calculator": {
      const values = nums(value);
      if (!values.length) throw new Error("Enter at least one number.");
      return String(values.reduce((sum, item) => sum + item, 0) / values.length);
    }
    case "median-calculator":
      return median(value);
    case "standard-deviation-calculator":
      return standardDeviation(value);
    case "age-calculator":
      return age(value);
    case "date-difference-calculator":
      return dateDifference(value);
    case "time-duration-calculator": {
      const [start, end] = nums(value);
      if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Enter two times in minutes.");
      return `${Math.abs(end - start)} minutes`;
    }
    case "compound-interest-calculator": {
      const [principal, rate, years] = nums(value);
      if (![principal, rate, years].every(Number.isFinite)) throw new Error("Enter principal, rate and years.");
      return String(principal * Math.pow(1 + rate / 100, years));
    }
    case "simple-interest-calculator": {
      const [principal, rate, years] = nums(value);
      if (![principal, rate, years].every(Number.isFinite)) throw new Error("Enter principal, rate and years.");
      return String((principal * rate * years) / 100);
    }
    case "discount-calculator": {
      const [price, discount] = nums(value);
      if (![price, discount].every(Number.isFinite)) throw new Error("Enter price and discount percentage.");
      return String(price * (1 - discount / 100));
    }
    case "profit-margin-calculator": {
      const [revenue, cost] = nums(value);
      if (![revenue, cost].every(Number.isFinite) || revenue === 0) throw new Error("Enter revenue and cost; revenue cannot be zero.");
      return `${(((revenue - cost) / revenue) * 100).toFixed(2)}%`;
    }
    case "markup-calculator": {
      const [cost, price] = nums(value);
      if (![cost, price].every(Number.isFinite) || cost === 0) throw new Error("Enter cost and price; cost cannot be zero.");
      return `${(((price - cost) / cost) * 100).toFixed(2)}%`;
    }
    case "break-even-calculator": {
      const [fixedCosts, contribution] = nums(value);
      if (![fixedCosts, contribution].every(Number.isFinite) || contribution === 0) throw new Error("Enter fixed costs and contribution per unit.");
      return String(fixedCosts / contribution);
    }
    case "qr-code-generator":
      if (!value.trim()) throw new Error("Enter a QR payload.");
      return `QR payload:\n${value.trim()}\n\nThe payload is ready for a QR renderer.`;
    case "color-picker":
      return value.trim() || "#06b6d4";
    case "hex-color-converter":
      return hexRgb(value);
    case "rgb-to-hex":
      return rgbHex(value);
    case "hex-to-rgb":
      return hexRgb(value);
    case "gitignore-generator":
      return "# Node / Next.js\nnode_modules/\n.next/\nout/\n.env*\n.DS_Store\n";
    case "robots-txt-generator":
      return "User-agent: *\nAllow: /\n\nSitemap: https://eldevo.com/sitemap.xml";
    case "sitemap-generator":
      return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://eldevo.com/</loc></url>\n</urlset>`;
    case "env-generator":
      return "NODE_ENV=production\nNEXT_PUBLIC_SITE_URL=https://eldevo.com\n";
    case "dockerfile-generator":
      return "FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nCMD [\"npm\",\"start\"]";
    case "docker-compose-generator":
      return "services:\n  app:\n    build: .\n    ports:\n      - \"3000:3000\"";
    case "image-to-base64":
    case "base64-to-image":
    case "image-resizer":
    case "image-cropper":
    case "image-compressor":
    case "jpg-to-png":
    case "png-to-jpg":
    case "webp-converter":
    case "favicon-generator":
      throw new Error("This image tool requires a file input. The current workspace accepts text only; use the file uploader on the tool page.");
    default:
      throw new Error(`Tool implementation is missing for: ${slug}`);
  }
}

export function StrategicToolWorkspace({ slug }: { slug: string }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setOutput(await transform(slug, input));
    } catch (errorValue) {
      setOutput("");
      setError(errorValue instanceof Error ? errorValue.message : String(errorValue));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setInput("");
    setOutput("");
    setError("");
  }, [slug]);

  const placeholder = useMemo(() => {
    if (slug.includes("calculator")) return "Enter numbers separated by spaces or commas…";
    if (slug.includes("generator")) return "Enter input or configuration…";
    if (slug.includes("json")) return '{"example": true}';
    return "Paste or type your input here…";
  }, [slug]);

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

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

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 font-mono text-xs text-rose-300"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Running…" : "Run tool"}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!output}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          Copy result
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-slate-600">
        Client-side processing · No signup · Your input is not sent to ElDevo.
      </p>
    </div>
  );
}
