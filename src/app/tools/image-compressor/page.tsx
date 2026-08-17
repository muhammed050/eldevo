import type { Metadata } from "next";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";

export const metadata: Metadata = { title: "Compress Image Online Free – Reduce Image Size | ElDevo", description: "Compress JPG, PNG and WebP images online and reduce file size while preserving quality. Fast, private and free.", alternates: { canonical: "https://eldevo.com/tools/image-compressor/" }, openGraph: { title: "Compress Image Online Free | ElDevo", description: "Reduce image file size locally in your browser.", url: "https://eldevo.com/tools/image-compressor/", type: "website" } };

export default function Page() { return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><header className="mb-7"><span className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Image Tools</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Compress Image Online</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Reduce JPG, PNG and WebP file sizes without uploading your images to a server.</p></header><ImageToolWorkspace operation="compress" /></main>; }
