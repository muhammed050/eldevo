import type { MetadataRoute } from "next";
import { toolEntries } from "@/lib/tool-registry";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "/",
    "/tools/",
    "/converters/",
    "/cheatsheets/",
    "/about/",
    "/contact/",
    "/privacy-policy/",
    "/terms/",
    "/disclaimer/",
  ];
  const activeToolPaths = toolEntries.map((tool) => tool.href);
  return [...new Set([...staticPaths, ...activeToolPaths])].map((path) => ({
    url: `https://eldevo.com${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
