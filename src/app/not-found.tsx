import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="font-mono text-7xl font-bold text-cyan-400">404</div>
      <h1 className="mt-4 text-2xl font-semibold">Tool not found</h1>
      <p className="mt-2 text-sm text-slate-400">That ElDevo route does not exist.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Back to tools
      </Link>
    </div>
  );
}
