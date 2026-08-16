import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About ElDevo",
  description: "Learn about ElDevo, a privacy-first browser-based developer tools hub.",
  alternates: { canonical: "https://eldevo.com/about/" },
};
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">About ElDevo</h1>
      <p className="mt-5 leading-7 text-slate-400">
        ElDevo is a developer micro-tools hub focused on fast, private browser-based utilities. The
        product is designed around a simple principle: if a task can run locally, your data should
        not need to leave your device.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Why client-side?</h2>
      <p className="mt-3 leading-7 text-slate-400">
        Formatting JSON, decoding a token, parsing CSV or converting YAML does not require a
        backend. ElDevo keeps those operations in JavaScript running in your browser.
      </p>
    </article>
  );
}
