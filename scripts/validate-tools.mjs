import fs from "node:fs";

const catalog = fs.readFileSync("src/config/seo-tools.catalog.ts", "utf8");
const config = fs.readFileSync("src/config/tools.config.ts", "utf8");
const engine = fs.readFileSync("src/lib/tools/real-engine.ts", "utf8");
const registry = fs.readFileSync("src/lib/tool-registry.ts", "utf8");

const slugs = new Set([...catalog.matchAll(/\["([a-z0-9-]+)"\s*,/g)].map(m => m[1]));
for (const s of config.matchAll(/slug:\s*"([a-z0-9-]+)"/g)) slugs.add(s[1]);
const unsupported = new Set([...registry.matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]));
const cases = new Set([...engine.matchAll(/case\s*"([a-z0-9-]+)"/g)].map(m => m[1]));
const forbidden = [/Processed by ElDevo/i, /return input\.trim\(\)/, /Math\.random\(/, /eval\(/, /new Function\(/];
const failures = [];
for (const slug of slugs) {
  if (unsupported.has(slug)) continue;
  if (!cases.has(slug)) failures.push(`Missing implementation: ${slug}`);
}
for (const re of forbidden) if (re.test(engine)) failures.push(`Forbidden implementation pattern: ${re}`);
const duplicates = [...slugs].filter((x,i,a)=>a.indexOf(x)!==i);
if (duplicates.length) failures.push(`Duplicate catalog slugs: ${[...new Set(duplicates)].join(", ")}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Validated ${slugs.size} catalog slugs; ${unsupported.size} explicitly unsupported and excluded from active registry.`);
