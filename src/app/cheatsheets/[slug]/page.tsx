import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cheatsheets } from "@/config/tools.config";
import { createSeoMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return cheatsheets.map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const x = cheatsheets.find((y) => y.slug === slug);

  if (!x) {
    return {};
  }

  return createSeoMetadata({
    item: x,
    type: "cheatsheet",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const x = cheatsheets.find((y) => y.slug === slug);

  if (!x) {
    return notFound();
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-slate-500">
        <Link href="/">Home</Link>
        <span className="px-2">/</span>
        Cheatsheets
        <span className="px-2">/</span>
        {x.title}
      </nav>

      <h1 className="mt-5 text-4xl font-bold">{x.h1}</h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{x.description}</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {x.sections.map((s) => (
          <section key={s.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-cyan-300">{s.title}</h2>

            <ul className="mt-4 grid gap-2">
              {s.items.map((i) => (
                <li
                  key={i}
                  className="rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300"
                >
                  {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Use these commands as a quick reference. Always review destructive commands before running
        them.
      </p>
    </article>
  );
}
