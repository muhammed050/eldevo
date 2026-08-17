import type { Metadata } from "next";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";

export const metadata: Metadata = { title: "Rotate & Flip Image Online Free | ElDevo", description: "Rotate JPG, PNG and WebP images by 90, 180 or 270 degrees and flip them horizontally or vertically online for free.", alternates: { canonical: "https://eldevo.com/tools/image-rotator/" }, openGraph: { title: "Rotate & Flip Image Online | ElDevo", description: "Rotate and flip images privately in your browser.", url: "https://eldevo.com/tools/image-rotator/", type: "website" } };

export default function Page() { return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><header className="mb-7"><span className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Image Tools</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Rotate &amp; Flip Image Online</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Rotate images by common angles or flip them horizontally and vertically, entirely in your browser.</p></header><ImageToolWorkspace operation="rotate" /></main>; }
