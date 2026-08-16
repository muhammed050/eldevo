import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contact ElDevo",
  description: "Contact ElDevo for product feedback, bug reports and partnership questions.",
  alternates: { canonical: "https://eldevo.com/contact/" },
};
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">Contact</h1>
      <p className="mt-5 leading-7 text-slate-400">
        For product feedback, bug reports or partnership questions, contact the ElDevo team through
        the email address published on the production site. Do not send secrets, API keys or private
        tokens in support messages.
      </p>
    </article>
  );
}
