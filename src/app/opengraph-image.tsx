import { renderOgImage, ogImageSize } from "@/lib/seo/og-image";

export const dynamic = "force-static";
export const size = ogImageSize;
export const contentType = "image/png";
export const alt = "ElDevo — Fast, Private Online Developer Tools";

export default async function Image() {
  return renderOgImage({
    title: "Fast, Private Online Developer Tools",
    category: "ElDevo",
  });
}
