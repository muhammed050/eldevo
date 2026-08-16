import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { converters } from "@/config/tools.config";
import { ToolPageContent } from "@/components/ToolPageContent";
import { createSeoMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return converters.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = converters.find((item) => item.slug === slug);

  if (!tool) {
    return {};
  }

  return createSeoMetadata({
    item: tool,
    type: "converter",
  });
}

export default async function ConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = converters.find((item) => item.slug === slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolPageContent
      meta={{ ...tool, kind: "converter" } as typeof tool & { kind: "converter" }}
      path={`/converters/${tool.slug}/`}
    />
  );
}
