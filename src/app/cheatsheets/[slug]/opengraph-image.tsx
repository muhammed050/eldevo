import { cheatsheets } from "@/config/tools.config";
import { renderOgImage, ogImageSize } from "@/lib/seo/og-image";

export const dynamic = "force-static";
export const size = ogImageSize;
export const contentType = "image/png";
export const alt = "ElDevo cheatsheet preview";

export function generateStaticParams() {
  return cheatsheets.map((sheet) => ({ slug: sheet.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sheet = cheatsheets.find((item) => item.slug === slug);
  return renderOgImage({
    title: sheet?.h1 ?? sheet?.title ?? "ElDevo Cheatsheets",
    category: "Cheatsheet",
  });
}
