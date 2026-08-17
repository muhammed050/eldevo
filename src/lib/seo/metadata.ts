import type { Metadata } from "next";
import type { ToolMeta } from "@/config/tools.config";
import { absoluteUrl } from "./urls";

export type SeoPageType = "tool" | "converter" | "cheatsheet";

type SeoItem = Pick<ToolMeta, "slug" | "title" | "description"> & {
  h1?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
};

type MetadataOptions = {
  item: SeoItem;
  type: SeoPageType;
};

function getPath(type: SeoPageType, slug: string): string {
  if (type === "tool") {
    return `/tools/${slug}/`;
  }

  if (type === "converter") {
    return `/converters/${slug}/`;
  }

  return `/cheatsheets/${slug}/`;
}

/**
 * Generate complete page metadata from the central content object.
 *
 * Works with tools, converters and cheatsheets without
 * forcing every content type to share the same data structure.
 */
export function createSeoMetadata({ item, type }: MetadataOptions): Metadata {
  const path = getPath(type, item.slug);
  const canonicalUrl = absoluteUrl(path);

  const keywords = [
    ...(item.primaryKeyword ? [item.primaryKeyword] : []),
    ...(item.secondaryKeywords ?? []),
  ];

  const pageTitle = item.h1 ?? item.title;

  return {
    title: pageTitle,
    description: item.description,

    ...(keywords.length > 0 ? { keywords } : {}),

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "ElDevo",
      title: pageTitle,
      description: item.description,
    },

    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: item.description,
    },
  };
}
