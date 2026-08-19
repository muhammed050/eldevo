import fs from "node:fs";

const core = fs.readFileSync("src/config/core-tools.ts", "utf8");
const loader = fs.readFileSync("src/lib/engines/loader.ts", "utf8");
const policy = fs.readFileSync("src/lib/engines/policy.ts", "utf8");
const legacy = fs.readFileSync("src/config/tools.config.ts", "utf8");
const failures = [];

const slugs = [...core.matchAll(/make\("([a-z0-9-]+)"/g)].map(m => m[1]);
const imageSlugs = [...core.matchAll(/\.\.\.make\("([a-z0-9-]+)"/g)].map(m => m[1]);
const allCoreSlugs = [...new Set([...slugs, ...imageSlugs])];
const loaded = new Set([...loader.matchAll(/^\s+"([a-z0-9-]+)": \{/gm)].map(m => m[1]));
const policies = new Set([...policy.matchAll(/^\s+"([a-z0-9-]+)": \{/gm)].map(m => m[1]));
const browserImageTools = new Set(["background-remover", "image-upscaler", "image-compressor-pro", "social-media-image-resizer", "image-to-pdf", "image-editor"]);

if (allCoreSlugs.length !== 21) failures.push(`Expected 21 core tools, found ${allCoreSlugs.length}`);
if (new Set(allCoreSlugs).size !== allCoreSlugs.length) failures.push("Duplicate core tool slug");

for (const slug of allCoreSlugs) {
  if (browserImageTools.has(slug)) continue;
  if (!loaded.has(slug)) failures.push(`Missing dedicated engine: ${slug}`);
  if (!policies.has(slug)) failures.push(`Missing engine policy: ${slug}`);
}

for (const slug of loaded) {
  if (!allCoreSlugs.includes(slug)) failures.push(`Loader has stale/unlisted engine: ${slug}`);
}
for (const slug of policies) {
  if (!loaded.has(slug)) failures.push(`Policy has stale/unlisted engine: ${slug}`);
}

const legacySlugs = [...legacy.matchAll(/slug:\s*["']([a-z0-9-]+)["']/g)].map(m => m[1]);
for (const slug of ["base64-encode-decode", "cron-expression-generator"]) {
  if (legacySlugs.includes(slug) && allCoreSlugs.includes(slug)) failures.push(`Canonical slug is duplicated across legacy/core registries: ${slug}`);
}

for (const file of fs.readdirSync("src/lib/engines")) {
  if (!file.endsWith("-engine.ts")) continue;
  const source = fs.readFileSync(`src/lib/engines/${file}`, "utf8");
  if (/Math\.random\(|eval\(|new Function\(/.test(source)) failures.push(`Forbidden pattern in ${file}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${allCoreSlugs.length} core tools, ${loaded.size} text engines, and ${browserImageTools.size} browser image tools.`);
