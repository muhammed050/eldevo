import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tools } from "@/config/tools.config";
import { ToolPageContent } from "@/components/ToolPageContent";
import { createSeoMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);

  if (!tool) {
    return {};
  }

  return createSeoMetadata({
    item: tool,
    type: "tool",
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolPageContent
      meta={{ ...tool, kind: "tool" } as typeof tool & { kind: "tool" }}
      path={`/tools/${tool.slug}/`}
    />
  );
}
