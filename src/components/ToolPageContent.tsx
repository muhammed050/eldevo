import Link from "next/link";
import type { ToolMeta } from "@/config/tools.config";
import { AdSlot, PrivacyBanner } from "@/components/Site";
import { ToolWorkspace } from "@/components/ToolWorkspace";
import { StrategicToolWorkspaceV2 } from "@/components/StrategicToolWorkspaceV2";
import { strategicToolSlugs } from "@/config/strategic-tools";

export function ToolPageContent({
  meta,
  path,
}: {
  meta: ToolMeta & { kind: "tool" | "converter" };
  path: string;
}) {
  const related = meta.related.map((href) => ({
    href,
    label: href.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Related tool",
  }));
  const webApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: meta.title,
    url: `https://eldevo.com${path}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    description: meta.description,
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://eldevo.com/" },
      {
        "@type": "ListItem",
        position: 2,
        name: meta.category,
        item: `https://eldevo.com/${meta.kind === "converter" ? "converters" : "tools"}/`,
      },
      { "@type": "ListItem", position: 3, name: meta.title, item: `https://eldevo.com${path}` },
    ],
  };
  const isStrategic = strategicToolSlugs.has(meta.slug);
  return (
    <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-slate-500">
        <Link href="/" className="hover:text-cyan-400">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link
          href={meta.kind === "converter" ? "/converters/" : "/tools/"}
          className="hover:text-cyan-400"
        >
          {meta.kind === "converter" ? "Converters" : meta.category}
        </Link>
        <span className="px-2">/</span>
        <span className="text-slate-300">{meta.title}</span>
      </nav>
      <header className="mb-7">
        <span className="rounded-full border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-cyan-300">
          {meta.category}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{meta.h1}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{meta.description}</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <PrivacyBanner />
          <div className="mt-5">
            {isStrategic ? (
              <StrategicToolWorkspaceV2 slug={meta.slug} />
            ) : (
              <ToolWorkspace slug={meta.slug} />
            )}
          </div>
          <div className="mt-6">
            <AdSlot />
          </div>
          <section className="mt-12">
            <h2 className="text-xl font-semibold">How to Use {meta.title}</h2>
            <ol className="mt-4 grid gap-3">
              {meta.usageSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-slate-400">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-800 font-mono text-xs text-cyan-300">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Why Use This Tool?</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-400">
              {meta.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-slate-500">{meta.searchIntent}</p>
          </section>
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Example</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <CodeBlock label="Input" value={meta.codeExample.input} />
              <CodeBlock label="Output" value={meta.codeExample.output} />
            </div>
          </section>
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
              {meta.faqs.map((item) => (
                <details key={item.q} className="p-5">
                  <summary className="cursor-pointer text-sm font-medium text-slate-200">
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-semibold">Related Tools</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm capitalize text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">Privacy-first processing</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              ElDevo is designed around browser-based processing. Unless a tool explicitly states
              otherwise, your input is transformed on your device rather than uploaded to an ElDevo
              server.
            </p>
          </section>
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <AdSlot label="Advertisement" />
          </div>
        </aside>
      </div>
    </article>
  );
}
function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-slate-500">
        {label}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-300">{value}</pre>
    </div>
  );
}
