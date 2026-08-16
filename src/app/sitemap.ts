import type { MetadataRoute } from "next";
import { allToolPaths } from "@/config/tools.config";
import { strategicToolMeta } from "@/config/strategic-tools";

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
  const strategicPaths = strategicToolMeta.map((tool) => `/tools/${tool.slug}/`);
  return [...new Set([...staticPaths, ...allToolPaths, ...strategicPaths])].map((path) => ({
    url: `https://eldevo.com${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
