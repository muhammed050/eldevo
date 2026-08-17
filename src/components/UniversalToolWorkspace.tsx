"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";
import { ImageSuiteWorkspace } from "@/components/image-tools/ImageSuiteWorkspace";
import { loadToolEngine } from "@/lib/engines/loader";

const samples: Record<string, string> = {
  "json-formatter": '{"name":"ElDevo","active":true}',
  "jwt-decoder": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbGRldm8iLCJleHAiOjQ3MDAwMDAwMDB9.signature",
  "base64-encoder": "ElDevo — browser tools",
  "base64-decoder": "RWxEZXZvIOKAlCBicm93c2VyIHRvb2xz",
  "regex-tester": "^hello$\n---TEST---\nhello\nhello world\nworld",
  "url-parser": "https://example.com/users?id=42&sort=desc#profile",
  "timestamp-converter": "1704067200",
  "uuid-generator": "5",
  "hash-generator": "ElDevo",
  "html-formatter": "<div><h1>Hello</h1><p>World</p></div>",
  "text-case-converter": "hello world from eldevo",
  "json-path-tester": '{"users":[{"name":"Ada"}]}\n---PATH---\n$.users[0].name',
  "json-schema-validator": '{"age":12}\n---SCHEMA---\n{"type":"object","required":["name"]}',
  "cron-generator": "0 9 * * 1-5",
  "text-stats": "ElDevo makes useful browser tools.\nFast and private.",
};

const imageSuiteTools = new Set([
  "background-remover",
  "image-upscaler",
  "image-compressor-pro",
  "social-media-image-resizer",
  "image-to-pdf",
]);

export function UniversalToolWorkspace({ slug }: { slug: string }) {
  if (slug === "image-editor") return <ImageToolWorkspace operation="editor" />;
  if (imageSuiteTools.has(slug)) return <ImageSuiteWorkspace tool={slug as "background-remover" | "image-upscaler" | "image-compressor-pro" | "social-media-image-resizer" | "image-to-pdf"} />;
  return <TextToolWorkspace slug={slug} />;
}

function TextToolWorkspace({ slug }: { slug: string }) {
  const [input, setInput] = useState(samples[slug] ?? "");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInput(samples[slug] ?? "");
    setOutput("");
    setError("");
  }, [slug]);

  const run = useCallback(async () => {
    setBusy(true);
    setOutput("");
    setError("");
    try {
      const engine = await loadToolEngine(slug);
      setOutput(await engine(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process this input.");
    } finally {
      setBusy(false);
    }
  }, [input, slug]);

  const copy = async () => { if (output) await navigator.clipboard.writeText(output); };
  const download = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-result.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-[.16em] text-cyan-300">Dedicated engine</span>
          <p className="mt-1 text-xs text-slate-500">Lazy-loaded only when you run this tool.</p>
        </div>
        <button onClick={run} disabled={busy || !input.trim()} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
          {busy ? "Loading engine…" : "Run Tool"}
        </button>
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} spellCheck={false} className="min-h-56 w-full resize-y rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-cyan-500" placeholder="Enter your value here…" />
      {error && <div role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><span className="text-xs font-medium text-slate-400">Output</span><div className="flex gap-2"><button onClick={copy} disabled={!output} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Copy</button><button onClick={download} disabled={!output} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Download</button></div></div>
        <pre className="min-h-32 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-slate-200">{output || (error ? "No result because execution failed." : "Run the tool to see the result.")}</pre>
      </div>
    </section>
  );
}
