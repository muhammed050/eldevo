import { converters, tools, type ToolMeta } from "@/config/tools.config";
import { strategicToolMeta } from "@/config/strategic-tools";

export type ToolEntry = ToolMeta & { kind: "tool" | "converter"; href: string };

// These operations require capabilities that the current static browser-only build does not provide
// reliably. They are deliberately excluded rather than exposing a UI that can only fake success.
export const unsupportedToolSlugs = new Set([
  "http-status-code-checker",
  "md5-generator",
  "regex-generator",
  "qr-code-generator",
  "image-to-base64",
  "base64-to-image",
  "image-resizer",
  "image-cropper",
  "image-compressor",
  "jpg-to-png",
  "png-to-jpg",
  "webp-converter",
  "favicon-generator",
]);

const allTools = [...tools, ...strategicToolMeta].filter((tool) => !unsupportedToolSlugs.has(tool.slug));
export const toolEntries: ToolEntry[] = [
  ...allTools.map((tool) => ({ ...tool, kind: "tool" as const, href: `/tools/${tool.slug}/` })),
  ...converters.map((tool) => ({ ...tool, kind: "converter" as const, href: `/converters/${tool.slug}/` })),
];

export const toolBySlug = new Map(toolEntries.map((tool) => [tool.slug, tool]));
export const categories = ["All", ...Array.from(new Set(toolEntries.map((tool) => tool.category)))];

export function searchTools(query: string, category = "All") {
  const q = query.trim().toLowerCase();
  return toolEntries
    .filter((tool) => category === "All" || tool.category === category)
    .map((tool) => {
      const haystack = [tool.title, tool.h1, tool.primaryKeyword, tool.category, tool.description, ...tool.secondaryKeywords].join(" ").toLowerCase();
      let score = q ? 0 : 1;
      if (q && tool.title.toLowerCase().startsWith(q)) score += 100;
      if (q && tool.primaryKeyword.toLowerCase() === q) score += 90;
      if (q && tool.title.toLowerCase().includes(q)) score += 60;
      if (q && haystack.includes(q)) score += 20;
      return { tool, score };
    })
    .filter(({ score }) => !q || score > 0)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
    .map(({ tool }) => tool);
}
