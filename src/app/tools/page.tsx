import type { Metadata } from "next";
import { ToolDirectory } from "@/components/Site";

export const metadata: Metadata = {
  title: "15 Core Developer Tools",
  description: "A focused set of production-ready developer tools with dedicated lazy-loaded browser engines.",
  alternates: { canonical: "https://eldevo.com/tools/" },
};

export default function ToolsPage() {
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-cyan-400">ElDevo Core</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">15 production-ready tools</h1>
        <p className="mt-3 max-w-3xl text-slate-400">Each core tool has its own engine module. Engines are loaded on demand so the first page load stays small and fast.</p>
      </header>
      <div className="mt-8"><ToolDirectory /></div>
    </article>
  );
}
