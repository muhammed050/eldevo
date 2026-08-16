import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Important limitations and responsible-use guidance for ElDevo developer tools.",
  alternates: { canonical: "https://eldevo.com/disclaimer/" },
};
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">Disclaimer</h1>
      <p className="mt-5 leading-7 text-slate-400">
        ElDevo tools are provided as-is for developer convenience. Validate generated code,
        schedules, queries and converted data before using them in production.
      </p>
      <p className="mt-5 leading-7 text-slate-400">
        A decoder or formatter does not constitute security verification. In particular, decoding a
        JWT does not verify its signature.
      </p>
    </article>
  );
}
