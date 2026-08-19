import type { ToolEngine } from "./shared";
import { getEnginePolicy, utf8ByteLength, type ToolEnginePolicy } from "./policy";

type EngineLoader = () => Promise<{ run: ToolEngine }>;

type EngineDefinition = {
  load: EngineLoader;
  policy: ToolEnginePolicy;
};

const coreLoaders: Record<string, EngineDefinition> = {
  "json-formatter": { load: () => import("./json-formatter-engine"), policy: getEnginePolicy("json-formatter") },
  "jwt-decoder": { load: () => import("./jwt-decoder-engine"), policy: getEnginePolicy("jwt-decoder") },
  "base64-encoder": { load: () => import("./base64-encoder-engine"), policy: getEnginePolicy("base64-encoder") },
  "base64-decoder": { load: () => import("./base64-decoder-engine"), policy: getEnginePolicy("base64-decoder") },
  "regex-tester": { load: () => import("./regex-tester-engine"), policy: getEnginePolicy("regex-tester") },
  "url-parser": { load: () => import("./url-parser-engine"), policy: getEnginePolicy("url-parser") },
  "timestamp-converter": { load: () => import("./timestamp-converter-engine"), policy: getEnginePolicy("timestamp-converter") },
  "uuid-generator": { load: () => import("./uuid-generator-engine"), policy: getEnginePolicy("uuid-generator") },
  "hash-generator": { load: () => import("./hash-generator-engine"), policy: getEnginePolicy("hash-generator") },
  "html-formatter": { load: () => import("./html-formatter-engine"), policy: getEnginePolicy("html-formatter") },
  "text-case-converter": { load: () => import("./text-case-converter-engine"), policy: getEnginePolicy("text-case-converter") },
  "json-path-tester": { load: () => import("./json-path-tester-engine"), policy: getEnginePolicy("json-path-tester") },
  "json-schema-validator": { load: () => import("./json-schema-validator-engine"), policy: getEnginePolicy("json-schema-validator") },
  "cron-generator": { load: () => import("./cron-generator-engine"), policy: getEnginePolicy("cron-generator") },
  "text-stats": { load: () => import("./text-stats-engine"), policy: getEnginePolicy("text-stats") },
};

export const coreEngineSlugs = Object.freeze(Object.keys(coreLoaders));

export function getToolEnginePolicy(slug: string): ToolEnginePolicy {
  const definition = coreLoaders[slug];
  if (!definition) throw new Error(`No dedicated engine is registered for ${slug}.`);
  return definition.policy;
}

export async function loadToolEngine(slug: string): Promise<ToolEngine> {
  const definition = coreLoaders[slug];
  if (!definition) throw new Error(`No dedicated engine is registered for ${slug}.`);
  const engine = (await definition.load()).run;
  const { maxInputBytes } = definition.policy;

  return async (input: string) => {
    if (utf8ByteLength(input) > maxInputBytes) {
      throw new Error(`Input is too large. This tool accepts up to ${Math.floor(maxInputBytes / 1_000_000)} MB of text.`);
    }
    return engine(input);
  };
}

export const isCoreEngine = (slug: string) => slug in coreLoaders;
