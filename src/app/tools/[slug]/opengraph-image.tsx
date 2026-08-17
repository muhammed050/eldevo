import { tools } from "@/config/tools.config";
import { strategicToolMeta } from "@/config/strategic-tools";
import { renderOgImage, ogImageSize } from "@/lib/seo/og-image";

const allTools = [...tools, ...strategicToolMeta];

export const dynamic = "force-static";
export const size = ogImageSize;
export const contentType = "image/png";
export const alt = "ElDevo tool preview";

export function generateStaticParams() {
  return allTools.map((tool) => ({ slug: tool.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = allTools.find((item) => item.slug === slug);
  return renderOgImage({
    title: tool?.h1 ?? tool?.title ?? "ElDevo",
    category: tool?.category ?? "Developer Tools",
  });
}
