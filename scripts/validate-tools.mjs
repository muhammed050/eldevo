import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const failures = [];
const root = process.cwd();
function fail(message) { failures.push(message); }

class ElementStub { constructor(tagName, text = "", attrs = {}) { this.tagName = tagName; this.textContent = text; this.attrs = attrs; this.children = []; } getAttribute(name) { return this.attrs[name] ?? null; } }
class DocumentStub {
  constructor(source, xml = false) { this.source = source; this.documentElement = new ElementStub("root"); this.title = (source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim(); if (xml) { const rootMatch = source.match(/^\s*(?:<\?xml[^>]*>\s*)?<([\w:.-]+)[^>]*>([\s\S]*)<\/\1>\s*$/); if (!rootMatch) { this.parserError = true; return; } this.documentElement = new ElementStub(rootMatch[1], rootMatch[2]); const token = /<([\w:.-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g; let match; while ((match = token.exec(rootMatch[2]))) this.documentElement.children.push(new ElementStub(match[1], match[2])); } }
  querySelector(selector) { return selector === "parsererror" && this.parserError ? new ElementStub("parsererror", "Invalid XML") : null; }
  querySelectorAll(selector) { if (selector === "a[href]") return [...this.source.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => new ElementStub("A", "", { href: m[1] })); const tags = selector.split(",").map((x) => x.trim().toLowerCase()); return [...this.source.matchAll(/<([a-z][\w-]*)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi)].filter((m) => tags.includes(m[1].toLowerCase())).map((m) => new ElementStub(m[1].toUpperCase(), m[2].replace(/<[^>]+>/g, "").trim())); }
}
if (typeof globalThis.DOMParser === "undefined") globalThis.DOMParser = class DOMParser { parseFromString(source, type) { return new DocumentStub(source, type === "application/xml"); } };
if (typeof globalThis.document === "undefined") globalThis.document = { createElement: () => ({ set innerHTML(value) { this.value = String(value).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); } }) };

const sourceFiles = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) sourceFiles.push(full); } }
walk(path.join(root, "src"));
const forbidden = [[/Processed by ElDevo locally/i, "fake success message"], [/Math\.random\s*\(/, "Math.random()"], [/\beval\s*\(/, "eval()"], [/\bnew\s+Function\s*\(/, "new Function()"], [/setTimeout\s*\([^\n]*processed|setTimeout\s*\([^\n]*success/i, "fake processing timer"]];
for (const file of sourceFiles) { const text = fs.readFileSync(file, "utf8"); for (const [pattern, label] of forbidden) if (pattern.test(text)) fail(`${label}: ${path.relative(root, file)}`); }

const registry = await import(pathToFileURL(path.join(root, "src/lib/tool-registry.ts")).href);
const executor = await import(pathToFileURL(path.join(root, "src/lib/tools/executor.ts")).href);
const { toolEntries, unsupportedToolSlugs, metadata } = registry;
const allSlugs = [...metadata.keys()];
const active = toolEntries.filter((tool) => tool.status === "active");
const activeSlugs = new Set(active.map((tool) => tool.slug));
if (active.length !== activeSlugs.size) fail("Duplicate active registry slug");
for (const slug of allSlugs) if (!unsupportedToolSlugs.has(slug) && !activeSlugs.has(slug)) fail(`Catalog tool is neither active nor explicitly unsupported: ${slug}`);
for (const slug of unsupportedToolSlugs) if (activeSlugs.has(slug)) fail(`Unsupported tool appears in active registry: ${slug}`);

function fixture(slug, example) {
  if (/json-schema-validator/.test(slug)) return '{"name":"ElDevo"}\n---SCHEMA---\n{"type":"object","required":["name"]}';
  if (/json-schema-generator/.test(slug)) return '{"name":"ElDevo","count":2}';
  if (/jsonpath|json-path/.test(slug)) return '{"users":[{"name":"Ada"}]}\n---PATH---\n$.users[0].name';
  if (/json-diff/.test(slug)) return '{"a":1}\n---DIFF---\n{"a":2}';
  if (/text-diff|text-compare/.test(slug)) return 'left\n---DIFF---\nright';
  if (/json-to-(csv|xml|javascript|typescript)/.test(slug)) return '{"name":"Ada","age":36}';
  if (/xml-to-json/.test(slug)) return '<root><name>Ada</name><item>1</item><item>2</item></root>';
  if (/json-unescape/.test(slug)) return 'hello\\nworld';
  if (/base64-decoder/.test(slug)) return 'RWxEZXZv';
  if (/hex-decoder/.test(slug)) return '4869';
  if (/binary-to-text/.test(slug)) return '01001000 01101001';
  if (/hmac/.test(slug)) return 'SHA-256\n---HMAC---\nsecret\nElDevo';
  if (/regex-tester/.test(slug)) return '^hello\n---TEST---\nhello world';
  if (/query-string-generator/.test(slug)) return '{"q":"eldevo","page":2}';
  if (/query-string-parser/.test(slug)) return 'https://example.com/?q=eldevo&page=2';
  if (/url-parser/.test(slug)) return 'https://example.com/users?id=42#profile';
  if (/domain-parser/.test(slug)) return 'https://blog.example.com';
  if (/user-agent/.test(slug)) return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36';
  if (/timestamp-(converter|generator)/.test(slug)) return '1704067200';
  if (/email-extractor/.test(slug)) return 'Contact test@example.com today.';
  if (/url-extractor/.test(slug)) return 'Visit https://example.com/docs today.';
  if (/heading-analyzer/.test(slug)) return '<h1>Main</h1><h2>Section</h2>';
  if (/internal-link-analyzer/.test(slug)) return '<a href="/about">About</a><a href="https://example.com">External</a>';
  if (/sitemap-generator/.test(slug)) return 'https://example.com/\nhttps://example.com/about';
  if (/robots-txt-generator/.test(slug)) return 'Disallow: /admin\nSitemap: https://example.com/sitemap.xml';
  if (/faq-schema/.test(slug)) return 'What is ElDevo?|A browser tool directory.';
  if (/article-schema|breadcrumb-schema|schema-markup/.test(slug)) return 'ElDevo\nhttps://example.com\nDeveloper tools';
  if (/meta-tag|open-graph|twitter-card|serp-snippet/.test(slug)) return 'ElDevo\nDeveloper tools\nhttps://example.com\nhttps://example.com/image.png';
  if (/keyword-density/.test(slug)) return 'ElDevo is a developer tool.\n---KEYWORD---\nElDevo';
  if (/canonical-url/.test(slug)) return 'https://example.com/page';
  if (/html-to-markdown/.test(slug)) return '<h1>Hello</h1><p>World</p>';
  if (/markdown-to-html/.test(slug)) return '# Hello\n\nWorld';
  if (/html-(formatter|minifier|validator)/.test(slug)) return '<!doctype html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
  if (/calculator/.test(slug) || /percentage|ratio|average|median|standard-deviation|discount|profit-margin|markup|interest|break-even/.test(slug)) { if (/age-calculator/.test(slug)) return '2000-01-01'; if (/date-difference/.test(slug)) return '2024-01-01\n2024-01-10'; if (/time-duration/.test(slug)) return '09:30\n10:45'; if (/compound-interest/.test(slug)) return '1000 5 2 12'; if (/simple-interest/.test(slug)) return '1000 5 2'; if (/break-even/.test(slug)) return '1000 50 30'; if (/percentage-change/.test(slug)) return '100 120'; if (/percentage-calculator/.test(slug)) return '20 200'; if (/discount/.test(slug)) return '200 10'; if (/profit-margin|markup/.test(slug)) return '100 80'; return '1 2 3 4'; }
  if (/hex-color|color-picker/.test(slug)) return '#0ea5e9';
  if (/rgb-to-hex/.test(slug)) return '14 165 233';
  if (/env-generator/.test(slug)) return 'DATABASE_URL\nAPI_KEY';
  if (/cron-(expression-generator|parser|humanizer)/.test(slug)) return '*/15 * * * *';
  if (/number-base-converter/.test(slug)) return '255 10 16';
  if (/text-case-converter/.test(slug)) return 'camel: hello world';
  if (/random-number/.test(slug)) return '1 10';
  if (/uuid/.test(slug)) return '2';
  if (/lorem/.test(slug)) return '2';
  return example || 'ElDevo';
}

for (const tool of active) {
  if (typeof tool.execute !== "function") fail(`No executor: ${tool.slug}`);
  if (typeof tool.validate !== "function") fail(`No validator: ${tool.slug}`);
  try { const result = await executor.executeActiveTool(tool.slug, fixture(tool.slug, tool.codeExample.input)); if (typeof result !== "string" || !result.trim()) fail(`Empty/non-string result: ${tool.slug}`); if (/Processed by ElDevo locally/i.test(result)) fail(`Fake result: ${tool.slug}`); }
  catch (error) { fail(`Execution failed for ${tool.slug}: ${error instanceof Error ? error.message : String(error)}`); }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Tool validation passed: ${allSlugs.length} catalog entries, ${active.length} active, ${unsupportedToolSlugs.size} unsupported.`);
