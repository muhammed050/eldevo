import type { ToolEngine } from "./shared";

const coreLoaders: Record<string, () => Promise<{ run: ToolEngine }>> = {
  "json-formatter": () => import("./json-formatter-engine"),
  "jwt-decoder": () => import("./jwt-decoder-engine"),
  "base64-encoder": () => import("./base64-encoder-engine"),
  "base64-decoder": () => import("./base64-decoder-engine"),
  "regex-tester": () => import("./regex-tester-engine"),
  "url-parser": () => import("./url-parser-engine"),
  "timestamp-converter": () => import("./timestamp-converter-engine"),
  "uuid-generator": () => import("./uuid-generator-engine"),
  "hash-generator": () => import("./hash-generator-engine"),
  "html-formatter": () => import("./html-formatter-engine"),
  "text-case-converter": () => import("./text-case-converter-engine"),
  "json-path-tester": () => import("./json-path-tester-engine"),
  "json-schema-validator": () => import("./json-schema-validator-engine"),
  "cron-generator": () => import("./cron-generator-engine"),
  "text-stats": () => import("./text-stats-engine"),
};

export async function loadToolEngine(slug: string): Promise<ToolEngine> {
  const loader = coreLoaders[slug];
  if (!loader) throw new Error(`No dedicated engine is registered for ${slug}.`);
  return (await loader()).run;
}

export const isCoreEngine = (slug: string) => slug in coreLoaders;
