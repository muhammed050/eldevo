import { coreTools } from "@/config/core-tools";
import { redirect } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return coreTools.map((tool) => ({ slug: tool.slug }));
}

export default async function ConverterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tools/${slug}/`);
}
