import Link from "next/link";
import { cheatsheets } from "@/config/tools.config";
export const metadata = {
  title: "Developer Cheatsheets",
  description: "Practical developer command cheatsheets.",
  alternates: { canonical: "https://eldevo.com/cheatsheets/" },
};
export default function Page() {
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold">Developer Cheatsheets</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Practical references you can keep open while working.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cheatsheets.map((x) => (
          <Link
            key={x.slug}
            href={`/cheatsheets/${x.slug}/`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-cyan-500/50"
          >
            <h2 className="font-semibold text-cyan-300">{x.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{x.description}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
