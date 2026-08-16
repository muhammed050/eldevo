import type { Metadata } from "next";
import Link from "next/link";
import { converters } from "@/config/tools.config";

export const metadata: Metadata = {
  title: "Code & Data Converters",
  description: "Convert developer data formats locally without uploading your files.",
  alternates: { canonical: "https://eldevo.com/converters/" },
};

export default function ConvertersPage() {
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold">Code & Data Converters</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Convert developer data formats locally without uploading your files.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {converters.map((item) => (
          <Link
            key={item.slug}
            href={`/converters/${item.slug}/`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/50"
          >
            <span className="font-mono text-[10px] uppercase tracking-[.18em] text-cyan-400">
              {item.category}
            </span>
            <h2 className="mt-2 font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
