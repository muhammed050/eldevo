import type { MetadataRoute } from "next";
import { allToolPaths } from "@/config/tools.config";
import { strategicToolMeta } from "@/config/strategic-tools";

export const dynamic = "force-static";
const guidePaths = ["/guides/", "/guides/format-json/", "/guides/decode-jwt/", "/guides/base64/", "/guides/cron-expressions/"];
const staticPaths = ["/", "/tools/", "/converters/", "/cheatsheets/", "/about/", "/contact/", "/privacy-policy/", "/terms/", "/disclaimer/", ...guidePaths];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...new Set([...staticPaths, ...allToolPaths, ...strategicToolMeta.map((tool) => `/tools/${tool.slug}/`)])].map((path) => ({
    url: `https://eldevo.com${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/guides/" ? 0.9 : 0.7,
  }));
}
