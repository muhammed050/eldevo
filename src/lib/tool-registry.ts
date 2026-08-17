import { converters, tools, type ToolMeta } from "../config/tools.config.ts";
import { strategicToolMeta } from "../config/strategic-tools.ts";
import { executeActiveTool } from "./tools/executor.ts";
import { ToolUnsupportedError } from "./tools/real-engine.ts";

export type ToolExecutor = (input: string) => Promise<string>;
export type ToolStatus = "active" | "unsupported";
export interface ToolDefinition extends ToolMeta { status: ToolStatus; kind: "tool" | "converter"; href: string; execute: ToolExecutor; validate: (input: string) => void; }
export type ToolEntry = ToolDefinition;

/** Capabilities that are deliberately not presented as fully implemented. */
export const unsupportedToolSlugs = new Set<string>([
  "http-status-code-checker", "md5-generator", "regex-generator", "qr-code-generator",
  "image-to-base64", "base64-to-image", "image-resizer", "image-cropper", "image-compressor", "jpg-to-png", "png-to-jpg", "webp-converter", "favicon-generator",
  "css-formatter", "css-minifier", "javascript-formatter", "javascript-minifier",
  "html-formatter", "html-minifier", "html-validator", "html-to-markdown", "markdown-to-html",
  "jsonpath-tester", "json-path-tester", "json-schema-generator", "json-schema-validator", "xml-to-json",
  "breadcrumb-schema-generator", "internal-link-analyzer", "cron-humanizer",
]);

const metadata = new Map<string, ToolMeta>();
for (const item of [...tools, ...strategicToolMeta, ...converters]) { if (metadata.has(item.slug)) throw new Error(`Duplicate tool slug: ${item.slug}`); metadata.set(item.slug, item); }
function validateInput(input: string): void { if (!input.trim()) throw new Error("Input is empty."); }
function definition(item: ToolMeta, kind: "tool" | "converter"): ToolDefinition { return { ...item, status: "active", kind, href: `/${kind === "converter" ? "converters" : "tools"}/${item.slug}/`, execute: (input) => executeActiveTool(item.slug, input), validate: validateInput }; }
export const toolEntries: ToolDefinition[] = [...tools.filter((item) => !unsupportedToolSlugs.has(item.slug)).map((item) => definition(item, "tool")), ...strategicToolMeta.filter((item) => !unsupportedToolSlugs.has(item.slug)).map((item) => definition(item, "tool")), ...converters.filter((item) => !unsupportedToolSlugs.has(item.slug)).map((item) => definition(item, "converter"))];
export const toolBySlug = new Map(toolEntries.map((tool) => [tool.slug, tool]));
export const categories = ["All", ...Array.from(new Set(toolEntries.map((tool) => tool.category)))];
export function searchTools(query: string, category = "All"): ToolDefinition[] { const q = query.trim().toLowerCase(); return toolEntries.filter((tool) => category === "All" || tool.category === category).map((tool) => { const haystack = [tool.title, tool.h1, tool.primaryKeyword, tool.category, tool.description, ...tool.secondaryKeywords].join(" ").toLowerCase(); let score = q ? 0 : 1; if (q && tool.title.toLowerCase().startsWith(q)) score += 100; if (q && tool.primaryKeyword.toLowerCase() === q) score += 90; if (q && tool.title.toLowerCase().includes(q)) score += 60; if (q && haystack.includes(q)) score += 20; return { tool, score }; }).filter(({ score }) => !q || score > 0).sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title)).map(({ tool }) => tool); }
export function getToolDefinition(slug: string): ToolDefinition | undefined { return toolBySlug.get(slug); }
export function isUnsupportedError(error: unknown): boolean { return error instanceof ToolUnsupportedError; }
export { metadata };
