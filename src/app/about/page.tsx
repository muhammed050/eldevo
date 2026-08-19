import type { Metadata } from "next";

export const metadata: Metadata = { title: "About ElDevo", description: "Learn what ElDevo is, how its tools work, and the principles behind the platform.", alternates: { canonical: "https://eldevo.com/about/" } };

export default function Page() {
  return <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
    <h1 className="text-4xl font-bold tracking-tight">About ElDevo</h1>
    <p className="mt-6 text-lg leading-8 text-slate-400">ElDevo is a focused hub of developer and web utilities for formatting, validation, conversion, debugging, and everyday technical work.</p>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      <section className="rounded-xl border p-6"><h2 className="text-xl font-semibold">Useful by design</h2><p className="mt-3 leading-7 text-slate-400">Each tool is built around a specific task and should provide clear instructions, useful examples, and predictable results.</p></section>
      <section className="rounded-xl border p-6"><h2 className="text-xl font-semibold">Privacy first</h2><p className="mt-3 leading-7 text-slate-400">Where a task can run locally, ElDevo is designed to keep the input in the browser instead of requiring an upload.</p></section>
      <section className="rounded-xl border p-6"><h2 className="text-xl font-semibold">Quality over quantity</h2><p className="mt-3 leading-7 text-slate-400">We prefer reliable, genuinely useful tools over duplicated pages created only to target search queries.</p></section>
    </div>
    <section className="mt-12 space-y-4"><h2 className="text-2xl font-semibold">How to use ElDevo</h2><p className="leading-7 text-slate-400">Choose a tool, read its instructions and limitations, provide the required input, then review or download the result. Sensitive values should only be entered when the page explicitly explains how they are processed.</p></section>
  </article>;
}
