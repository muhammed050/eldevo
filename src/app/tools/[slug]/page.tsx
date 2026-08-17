import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toolEntries } from "@/lib/tool-registry";
import { ToolPageContent } from "@/components/ToolPageContent";
import { createSeoMetadata } from "@/lib/seo/metadata";

const allTools = toolEntries.filter((tool) => tool.kind === "tool");
export const dynamicParams = false;

export function generateStaticParams() {
  return allTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = allTools.find((item) => item.slug === slug);
  if (!tool) return {};
  return createSeoMetadata({ item: tool, type: "tool" });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = allTools.find((item) => item.slug === slug);
  if (!tool) notFound();
  return <ToolPageContent meta={tool} path={`/tools/${tool.slug}/`} />;
}
