import { redirect } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() { return []; }

export default function ConverterPage() {
  redirect("/tools/");
}
