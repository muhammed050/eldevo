import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const failures = [];
const root = process.cwd();

function fail(message) { failures.push(message); }

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, "src"));

const forbidden = [
  [/Processed by ElDevo/i, "fake success message"],
  [/Math\.random\s*\(/, "Math.random()"],
  [/\beval\s*\(/, "eval()"],
  [/\bnew\s+Function\s*\(/, "new Function()"],
  [/setTimeout\s*\([^\n]*processed|setTimeout\s*\([^\n]*success/i, "fake processing timer"],
];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const [pattern, label] of forbidden) if (pattern.test(text)) fail(`${label}: ${path.relative(root, file)}`);
}

const registryUrl = pathToFileURL(path.join(root, "src/lib/tool-registry.ts")).href;
const engineUrl = pathToFileURL(path.join(root, "src/lib/tools/real-engine.ts")).href;
const registry = await import(registryUrl);
const engine = await import(engineUrl);
const { toolEntries, unsupportedToolSlugs, metadata } = registry;

const allSlugs = [...metadata.keys()];
const active = toolEntries.filter((tool) => tool.status === "active");
const activeSlugs = new Set(active.map((tool) => tool.slug));

if (active.length !== activeSlugs.size) fail("Duplicate active registry slug");
for (const slug of allSlugs) {
  if (!unsupportedToolSlugs.has(slug) && !activeSlugs.has(slug)) fail(`Catalog tool is neither active nor explicitly unsupported: ${slug}`);
}
for (const slug of unsupportedToolSlugs) {
  if (activeSlugs.has(slug)) fail(`Unsupported tool appears in active registry: ${slug}`);
}

// Execute every active tool with its documented example. An unsupported error or
// a missing implementation is a hard failure; ordinary validation errors are
// also failures because the example is part of the public tool contract.
function fixture(slug, example) {
  if (/json-schema-validator/.test(slug)) return '{"name":"ElDevo"}\n---SCHEMA---\n{"type":"object","required":["name"]}';
  if (/jsonpath|json-path/.test(slug)) return '{"users":[{"name":"Ada"}]}\n---PATH---\n$.users[0].name';
  if (/hmac/.test(slug)) return 'SHA-256\n---HMAC---\nsecret\nElDevo';
  if (/regex-tester/.test(slug)) return '^hello\n---TEST---\nhello world';
  if (/query-string-generator/.test(slug)) return '{"q":"eldevo","page":2}';
  if (/heading-analyzer/.test(slug)) return '<h1>Main</h1><h2>Section</h2>';
  if (/internal-link-analyzer/.test(slug)) return '<a href="/about">About</a>';
  if (/sitemap-generator/.test(slug)) return 'https://example.com/';
  if (/robots-txt-generator/.test(slug)) return 'Disallow: /admin\nSitemap: https://example.com/sitemap.xml';
  if (/faq-schema/.test(slug)) return 'What is ElDevo?|A browser tool directory.';
  if (/article-schema|breadcrumb-schema|schema-markup/.test(slug)) return 'ElDevo\nhttps://example.com\nDeveloper tools';
  if (/meta-tag|open-graph|twitter-card|serp-snippet/.test(slug)) return 'ElDevo\nDeveloper tools\nhttps://example.com\nhttps://example.com/image.png';
  if (/keyword-density/.test(slug)) return 'ElDevo is a developer tool.\n---KEYWORD---\nElDevo';
  if (/calculator|percentage|ratio|average|median|standard-deviation|discount|profit-margin|markup|interest|break-even/.test(slug)) {
    if (/age-calculator/.test(slug)) return '2000-01-01';
    if (/date-difference/.test(slug)) return '2024-01-01\n2024-01-10';
    if (/time-duration/.test(slug)) return '09:30\n10:45';
    if (/compound-interest/.test(slug)) return '1000 5 2 12';
    if (/simple-interest/.test(slug)) return '1000 5 2';
    if (/break-even/.test(slug)) return '1000 50 30';
    return '20 200';
  }
  return example || "ElDevo";
}

for (const tool of active) {
  if (typeof tool.execute !== "function") fail(`No executor: ${tool.slug}`);
  if (typeof tool.validate !== "function") fail(`No validator: ${tool.slug}`);
  try {
    const result = await tool.execute(fixture(tool.slug, tool.codeExample.input));
    if (typeof result !== "string" || !result.trim()) fail(`Empty/non-string result: ${tool.slug}`);
    if (/Processed by ElDevo locally/i.test(result)) fail(`Fake result: ${tool.slug}`);
  } catch (error) {
    fail(`Execution failed for ${tool.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Tool validation passed: ${allSlugs.length} catalog entries, ${active.length} active, ${unsupportedToolSlugs.size} unsupported.`);
