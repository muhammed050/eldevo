/**
 * Centralized URL helpers for ElDevo SEO.
 *
 * Single Source of Truth:
 * - All canonical URLs are generated from these helpers.
 * - Never hard-code https://eldevo.com inside individual pages.
 */

export const SITE_URL = "https://eldevo.com";

export type SeoContentType = "tool" | "converter" | "cheatsheet";

/**
 * Normalize a site path so we always generate consistent URLs.
 *
 * Examples:
 * "/"                      -> "/"
 * "/tools/json-formatter" -> "/tools/json-formatter/"
 * "tools/json-formatter"  -> "/tools/json-formatter/"
 */
export function normalizePath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

/**
 * Build an absolute canonical URL.
 */
export function absoluteUrl(path: string): string {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") {
    return `${SITE_URL}/`;
  }

  return `${SITE_URL}${normalizedPath}`;
}

/**
 * Build a URL from a content type and slug.
 */
export function contentUrl(type: SeoContentType, slug: string): string {
  const section = type === "tool" ? "tools" : type === "converter" ? "converters" : "cheatsheets";

  return absoluteUrl(`/${section}/${slug}`);
}

/**
 * Build the canonical URL for a tool.
 */
export function toolUrl(slug: string): string {
  return contentUrl("tool", slug);
}

/**
 * Build the canonical URL for a converter.
 */
export function converterUrl(slug: string): string {
  return contentUrl("converter", slug);
}

/**
 * Build the canonical URL for a cheatsheet.
 */
export function cheatsheetUrl(slug: string): string {
  return contentUrl("cheatsheet", slug);
}
