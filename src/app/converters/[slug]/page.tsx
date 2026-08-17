import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toolEntries } from "@/lib/tool-registry";
import { ToolPageContent } from "@/components/ToolPageContent";
import { createSeoMetadata } from "@/lib/seo/metadata";

const activeConverters = toolEntries.filter((tool) => tool.kind === "converter");
export const dynamicParams = false;

export function generateStaticParams() {
  return activeConverters.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = activeConverters.find((item) => item.slug === slug);
  return tool ? createSeoMetadata({ item: tool, type: "converter" }) : {};
}

export default async function ConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = activeConverters.find((item) => item.slug === slug);
  if (!tool) notFound();
  return <ToolPageContent meta={tool} path={`/converters/${tool.slug}/`} />;
}
