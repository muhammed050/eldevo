import { converters } from "@/config/tools.config";
import { renderOgImage, ogImageSize } from "@/lib/seo/og-image";

export const dynamic = "force-static";
export const size = ogImageSize;
export const contentType = "image/png";
export const alt = "ElDevo converter preview";

export function generateStaticParams() {
  return converters.map((tool) => ({ slug: tool.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = converters.find((item) => item.slug === slug);
  return renderOgImage({
    title: tool?.h1 ?? tool?.title ?? "ElDevo Converters",
    category: tool?.category ?? "Converters",
  });
}
