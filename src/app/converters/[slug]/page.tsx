import { coreTools } from "@/config/core-tools";
import { redirect } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return coreTools.map((tool) => ({ slug: tool.slug }));
}

export default function ConverterPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/tools/${params.slug}/`);
}
