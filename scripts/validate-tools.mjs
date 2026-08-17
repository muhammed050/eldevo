import fs from "node:fs";

const core = fs.readFileSync("src/config/core-tools.ts", "utf8");
const loader = fs.readFileSync("src/lib/engines/loader.ts", "utf8");
const failures = [];
const slugs = [...core.matchAll(/make\("([a-z0-9-]+)"/g)].map(m => m[1]);
const loaded = new Set([...loader.matchAll(/"([a-z0-9-]+)": \(\) => import/g)].map(m => m[1]));
const browserImageTools = new Set(["background-remover", "image-upscaler", "image-compressor-pro", "social-media-image-resizer", "image-to-pdf", "image-editor"]);
if (slugs.length !== 20) failures.push(`Expected 20 text-engine core tools, found ${slugs.length}`);
for (const slug of slugs) {
  if (browserImageTools.has(slug)) continue;
  if (!loaded.has(slug)) failures.push(`Missing dedicated engine: ${slug}`);
}
if (new Set(slugs).size !== slugs.length) failures.push("Duplicate core tool slug");
for (const file of fs.readdirSync("src/lib/engines")) {
  if (!file.endsWith("-engine.ts")) continue;
  const source = fs.readFileSync(`src/lib/engines/${file}`, "utf8");
  if (/Math\.random\(|eval\(|new Function\(/.test(source)) failures.push(`Forbidden pattern in ${file}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Validated ${slugs.length} text-engine tools plus ${browserImageTools.size} browser image tools.`);
