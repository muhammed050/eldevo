"use client";

import { useEffect, useState } from "react";

type JsonValue = unknown;

const JSON_TOOL_SLUGS = new Set([
  "json-beautifier",
  "json-viewer",
  "json-minifier",
  "json-validator",
  "json-sorter",
  "json-escape",
  "json-unescape",
  "json-to-csv",
  "json-to-xml",
  "json-to-javascript",
  "json-to-typescript-interface",
  "json-schema-generator",
  "jsonpath-tester",
]);

function parseJson(input: string): JsonValue {
  let value = input.replace(/^\uFEFF/, "").trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) value = fenced[1].trim();
  if (!value) throw new Error("Enter a JSON object or array.");

  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/position\s+(\d+)/i);
    if (match) {
      const position = Number(match[1]);
      const before = value.slice(0, position);
      const line = before.split("\n").length;
      const column = position - before.lastIndexOf("\n");
      throw new Error(`Invalid JSON: ${message} · line ${line}, column ${column}`);
    }
    throw new Error(`Invalid JSON: ${message}`);
  }
}

function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  return value;
}

function jsonToCsv(value: JsonValue): string {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  ) {
    throw new Error("Enter a JSON array of objects.");
  }
  const rows = value as Record<string, unknown>[];
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cell = (item: unknown) => `"${String(item ?? "").replaceAll('"', '""')}"`;
  return [
    keys.map(cell).join(","),
    ...rows.map((row) => keys.map((key) => cell(row[key])).join(",")),
  ].join("\n");
}

function jsonToTs(value: JsonValue): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return `type Root = ${Array.isArray(value) ? "unknown[]" : typeof value};`;
  }
  const typeOf = (item: unknown): string => {
    if (item === null) return "null";
    if (Array.isArray(item)) return "unknown[]";
    if (typeof item === "object") return "Record<string, unknown>";
    return typeof item;
  };
  const fields = Object.entries(value as Record<string, unknown>)
    .map(
      ([key, item]) =>
        `  ${/^[$A-Z_a-z][$\w]*$/.test(key) ? key : JSON.stringify(key)}: ${typeOf(item)};`,
    )
    .join("\n");
  return `export interface Root {\n${fields}\n}`;
}

function jsonToXml(value: JsonValue, root = "root"): string {
  const escape = (text: string) =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  if (value === null || typeof value !== "object")
    return `<${root}>${escape(String(value ?? ""))}</${root}>`;
  if (Array.isArray(value))
    return `<${root}>${value.map((item) => jsonToXml(item, "item")).join("")}</${root}>`;
  return `<${root}>${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => jsonToXml(item, key.replace(/[^\w-]/g, "_")))
    .join("")}</${root}>`;
}

function transform(slug: string, input: string): string {
  if (!JSON_TOOL_SLUGS.has(slug)) throw new Error("Unsupported JSON tool.");
  if (slug === "json-escape") return JSON.stringify(input).slice(1, -1);
  if (slug === "json-unescape") return JSON.parse(`"${input}"`);

  const value = parseJson(input);
  switch (slug) {
    case "json-beautifier":
    case "json-viewer":
      return JSON.stringify(value, null, 2);
    case "json-minifier":
      return JSON.stringify(value);
    case "json-validator":
      return "Valid JSON\n\nThe input is valid JSON.";
    case "json-sorter":
      return JSON.stringify(sortJson(value), null, 2);
    case "json-to-csv":
      return jsonToCsv(value);
    case "json-to-xml":
      return jsonToXml(value);
    case "json-to-javascript":
      return `const data = ${JSON.stringify(value, null, 2)};`;
    case "json-to-typescript-interface":
      return jsonToTs(value);
    case "json-schema-generator": {
      const properties =
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.fromEntries(
              Object.entries(value as Record<string, unknown>).map(([key, item]) => [
                key,
                { type: Array.isArray(item) ? "array" : item === null ? "null" : typeof item },
              ]),
            )
          : {};
      return JSON.stringify(
        { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties },
        null,
        2,
      );
    }
    case "jsonpath-tester": {
      const separator = input.match(/\r?\n---PATH---\r?\n/i);
      if (!separator) return JSON.stringify(value, null, 2);
      const [, path] = input.split(/\r?\n---PATH---\r?\n/i);
      const parts = (path ?? "")
        .trim()
        .replace(/^\$\.?/, "")
        .split(".")
        .filter(Boolean);
      let current: unknown = value;
      for (const part of parts) current = (current as Record<string, unknown> | undefined)?.[part];
      return JSON.stringify(current, null, 2);
    }
    default:
      throw new Error("Unsupported JSON tool.");
  }
}

export function JsonToolWorkspace({ slug }: { slug: string }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setInput("");
    setOutput("");
    setError("");
  }, [slug]);

  function run() {
    try {
      setError("");
      setOutput(transform(slug, input));
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : String(caught));
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
            placeholder="Paste or type valid JSON here…"
            spellCheck={false}
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
          className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 font-mono text-xs leading-6 text-rose-300"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Run tool
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(output)}
          disabled={!output}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          Copy result
        </button>
        <button
          type="button"
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
        Client-side JSON processing · BOM and fenced JSON are handled automatically.
      </p>
    </div>
  );
}
