import type { ToolMeta } from "@/config/tools.config";
import { coreTools, type CoreToolMeta } from "@/config/core-tools";
import { isCoreEngine } from "@/lib/engines/loader";

export type ToolEntry = CoreToolMeta & {
  kind: "tool";
  href: string;
  hasDedicatedEngine: boolean;
};

export const toolEntries: ToolEntry[] = coreTools.map(tool => ({
  ...tool,
  kind: "tool" as const,
  href: `/tools/${tool.slug}/`,
  hasDedicatedEngine: tool.engineId === "image-suite" || tool.engineId === "image-editor" || isCoreEngine(tool.engineId ?? tool.slug),
}));

export const toolBySlug = new Map(toolEntries.map(tool => [tool.slug, tool]));
export const categories = ["All", ...Array.from(new Set(toolEntries.map(tool => tool.category)))];

export function getTool(slug: string): ToolEntry | undefined {
  return toolBySlug.get(slug);
}

export function searchTools(query: string, category = "All") {
  const q = query.trim().toLowerCase();
  return toolEntries
    .filter(tool => category === "All" || tool.category === category)
    .map(tool => {
      const haystack = [tool.title, tool.h1, tool.primaryKeyword, tool.category, tool.description, ...tool.secondaryKeywords].join(" ").toLowerCase();
      let score = q ? 0 : 1;
      if (q && tool.title.toLowerCase().startsWith(q)) score += 100;
      if (q && tool.primaryKeyword.toLowerCase() === q) score += 90;
      if (q && tool.title.toLowerCase().includes(q)) score += 60;
      if (q && haystack.includes(q)) score += 20;
      if (q && tool.hasDedicatedEngine) score += 2;
      return { tool, score };
    })
    .filter(({ score }) => !q || score > 0)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
    .map(({ tool }) => tool);
}

export type { ToolMeta };
