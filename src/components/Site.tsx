"use client";

import Link from "next/link";
import {
  ArrowRight,
  Command,
  Search,
  ShieldCheck,
  Star,
  Terminal,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { categories, searchTools, toolEntries, type ToolEntry } from "@/lib/tool-registry";
import { homeFaqs } from "@/config/home-faqs";

const FAVORITES_KEY = "eldevo:favorites";
const RECENT_KEY = "eldevo:recent";

function readList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function Header() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" onClick={() => trackRecent("/")}>
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-500 text-slate-950">
              <Terminal className="size-4" />
            </span>
            <span className="font-mono text-sm font-bold">
              El<span className="text-cyan-400">Devo</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
            <Link href="/tools/" className="hover:text-cyan-400">
              Tools
            </Link>

            <Link href="/converters/" className="hover:text-cyan-400">
              Converters
            </Link>

            <Link href="/cheatsheets/" className="hover:text-cyan-400">
              Cheatsheets
            </Link>

            <Link href="/about/" className="hover:text-cyan-400">
              About
            </Link>

            <Link href="/privacy-policy/" className="hover:text-cyan-400">
              Privacy Policy
            </Link>

            <Link href="/terms/" className="hover:text-cyan-400">
              Terms
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"
            aria-label="Open tool search"
          >
            <Command className="size-3.5" />
            <span className="hidden sm:inline">Search tools</span>
            <kbd className="hidden rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              Ctrl K
            </kbd>
          </button>
        </div>
      </header>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ElDevo · eldevo.com</span>

          <span>100% client-side. Your data never touches our servers.</span>
        </div>

        <nav
          aria-label="Legal and information links"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 pt-5"
        >
          <Link href="/privacy-policy/" className="transition hover:text-cyan-400">
            Privacy Policy
          </Link>

          <Link href="/terms/" className="transition hover:text-cyan-400">
            Terms of Use
          </Link>

          <Link href="/disclaimer/" className="transition hover:text-cyan-400">
            Disclaimer
          </Link>

          <Link href="/contact/" className="transition hover:text-cyan-400">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
export function PrivacyBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-slate-300">
      <ShieldCheck className="size-5 shrink-0 text-emerald-400" />
      <span>
        <strong className="text-slate-100">100% Client-Side.</strong> Your data is processed locally
        and is never sent to an ElDevo processing server.
      </span>
    </div>
  );
}
export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950 text-[10px] uppercase tracking-[.2em] text-slate-700"
    >
      {label}
    </div>
  );
}

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchTools(query).slice(0, 8), [query]);
  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => undefined}
          placeholder="Search JSON, JWT, cron, Base64…"
          className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
      </label>
      {query && <SearchResults results={results} />}
    </div>
  );
}

function SearchResults({ results }: { results: ToolEntry[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-left">
      {results.map((tool) => (
        <Link
          key={`${tool.kind}-${tool.slug}`}
          href={tool.href}
          onClick={() => trackRecent(tool.slug)}
          className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm last:border-0 hover:bg-slate-800/70"
        >
          <span>
            <span className="mr-2 text-[10px] uppercase tracking-wider text-cyan-400">
              {tool.category}
            </span>
            {tool.title}
          </span>
          <ArrowRight className="size-4 text-slate-500" />
        </Link>
      ))}
      {!results.length && <div className="p-4 text-sm text-slate-500">No matching tool.</div>}
    </div>
  );
}

export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    setFavorites(readList(FAVORITES_KEY));
    setRecent(readList(RECENT_KEY));
  }, []);
  const results = useMemo(() => searchTools(query, category), [query, category]);
  const recentTools = recent
    .map((slug) => toolEntries.find((tool) => tool.slug === slug))
    .filter(Boolean) as ToolEntry[];
  const favoriteTools = favorites
    .map((slug) => toolEntries.find((tool) => tool.slug === slug))
    .filter(Boolean) as ToolEntry[];
  function toggleFavorite(slug: string) {
    const next = favorites.includes(slug)
      ? favorites.filter((item) => item !== slug)
      : [...favorites, slug];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, keywords, categories…"
            className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900 pl-11 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`min-h-10 rounded-lg border px-3 text-xs ${category === item ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {favoriteTools.length > 0 && !query && category === "All" && (
        <DirectorySection
          title="Favorites"
          tools={favoriteTools}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      )}
      {recentTools.length > 0 && !query && category === "All" && (
        <DirectorySection
          title="Recently used"
          tools={recentTools}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      )}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">{results.length} tools</h2>
        <span className="text-xs text-slate-600">Ctrl/Cmd + K opens global search</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((tool) => (
          <ToolCard
            key={`${tool.kind}-${tool.slug}`}
            tool={tool}
            favorite={favorites.includes(tool.slug)}
            onFavorite={() => toggleFavorite(tool.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function DirectorySection({
  title,
  tools: entries,
  favorites,
  toggleFavorite,
}: {
  title: string;
  tools: ToolEntry[];
  favorites: string[];
  toggleFavorite: (slug: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {entries.map((tool) => (
          <div
            key={tool.slug}
            className="min-w-56 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500/40"
          >
            <div className="flex items-center justify-between">
              <Link
                href={tool.href}
                onClick={() => trackRecent(tool.slug)}
                className="text-[10px] uppercase tracking-wider text-cyan-400"
              >
                {tool.category}
              </Link>
              <button
                type="button"
                aria-label={favorites.includes(tool.slug) ? "Remove favorite" : "Add favorite"}
                onClick={() => toggleFavorite(tool.slug)}
              >
                <Star
                  className={`size-4 ${favorites.includes(tool.slug) ? "fill-current text-cyan-400" : "text-slate-600"}`}
                />
              </button>
            </div>
            <Link
              href={tool.href}
              onClick={() => trackRecent(tool.slug)}
              className="mt-2 block text-sm font-semibold hover:text-cyan-300"
            >
              {tool.title}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolCard({
  tool,
  favorite,
  onFavorite,
}: {
  tool: ToolEntry;
  favorite: boolean;
  onFavorite?: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-[0_0_30px_-20px_rgba(6,182,212,.8)]">
      {onFavorite && (
        <button
          type="button"
          onClick={onFavorite}
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-600 hover:text-cyan-400"
        >
          <Star className={`size-4 ${favorite ? "fill-current text-cyan-400" : ""}`} />
        </button>
      )}
      <Link href={tool.href} onClick={() => trackRecent(tool.slug)} className="block pr-6">
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-teal-400">
          {tool.category}
        </span>
        <h3 className="mt-2 font-semibold group-hover:text-cyan-400">{tool.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
      </Link>
    </div>
  );
}

export function Home() {
  const [category, setCategory] = useState("All");
  const items = useMemo(() => searchTools("", category), [category]);
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-3 py-1 text-xs text-cyan-300">
            <Zap className="size-3.5" /> Fast. Private. Browser-only.
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl">
            Developer tools that run{" "}
            <span className="text-cyan-400">entirely in your browser.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Format, validate, decode and convert developer data instantly. No accounts, no uploads,
            no backend processing.
          </p>
          <HomeSearch />
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            <Perk icon={<Zap />} title="Instant" body="No round trips or waiting for an API." />
            <Perk
              icon={<ShieldCheck />}
              title="Private"
              body="Tokens and payloads stay on this device."
            />
            <Perk icon={<Wifi />} title="Installable" body="Use ElDevo as a lightweight PWA." />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.2em] text-cyan-400">
              Developer toolkit
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Find the right tool quickly</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`min-h-9 rounded-lg border px-3 text-xs ${category === item ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-400 hover:text-slate-200"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 12).map((tool) => (
            <ToolCard key={`${tool.kind}-${tool.slug}`} tool={tool} favorite={false} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/tools/"
            className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
          >
            Browse all tools <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <PrivacyBanner />
        <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-400">
          ElDevo is a privacy-first hub for small developer tasks. Parsers, encoders, formatters and
          converters execute in the browser so sensitive tokens, source snippets and data files do
          not need to leave your machine.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
          Most developer utility sites route your input through a backend before returning a result.
          ElDevo takes a different approach: every tool on this site — from the JSON formatter and
          JWT decoder to the Base64, regex and SQL utilities — runs as JavaScript in your own
          browser tab. There is no upload step, no processing queue and no server-side log of what
          you pasted in. That also means the tools keep working once the page has loaded, even if
          your connection drops.
        </p>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="text-xl font-semibold text-slate-100">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
          {homeFaqs.map((item) => (
            <details key={item.q} className="p-5">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function Perk({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <span className="text-cyan-400">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = useMemo(() => searchTools(query).slice(0, 12), [query]);
  useEffect(() => {
    setIndex(0);
  }, [query]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  function handleKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((value) => Math.min(value + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && results[index]) window.location.href = results[index].href;
  }
  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search tools"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center border-b border-slate-800 px-4">
          <Search className="size-5 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKey}
            placeholder="Search tools and keywords…"
            className="h-14 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:text-slate-200"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-auto p-2">
          {results.map((tool, resultIndex) => (
            <Link
              key={`${tool.kind}-${tool.slug}`}
              href={tool.href}
              onClick={() => {
                trackRecent(tool.slug);
                onClose();
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${resultIndex === index ? "bg-slate-800 text-cyan-300" : "text-slate-300 hover:bg-slate-800/70"}`}
            >
              <span className="grid size-8 place-items-center rounded-md bg-slate-950 font-mono text-[10px] text-cyan-400">
                {tool.category.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{tool.title}</span>
                <span className="text-xs text-slate-500">{tool.primaryKeyword}</span>
              </span>
              <ArrowRight className="size-4 text-slate-600" />
            </Link>
          ))}
          {!results.length && (
            <div className="p-8 text-center text-sm text-slate-500">No matching tools.</div>
          )}
        </div>
        <div className="border-t border-slate-800 px-4 py-3 text-[10px] text-slate-600">
          ↑ ↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}

function trackRecent(slug: string) {
  if (typeof window === "undefined" || slug === "/") return;
  try {
    const current = readList(RECENT_KEY);
    const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage can be unavailable in privacy modes */
  }
}
