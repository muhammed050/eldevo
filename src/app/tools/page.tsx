import type { Metadata } from "next";
import { ToolDirectory } from "@/components/Site";

export const metadata: Metadata = {
  title: "Developer Tools",
  description:
    "Fast browser-based developer utilities for JSON, security, encoding, web development, SQL and data conversion.",
  alternates: { canonical: "https://eldevo.com/tools/" },
};

export default function ToolsPage() {
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-cyan-400">ElDevo toolkit</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Developer Tools</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Search, filter and save browser-based tools for JSON, JWT, Cron, encoding, SQL, URLs, text
          and more.
        </p>
      </header>
      <div className="mt-8">
        <ToolDirectory />
      </div>
    </article>
  );
}
