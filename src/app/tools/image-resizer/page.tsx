import type { Metadata } from "next";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";

export const metadata: Metadata = { title: "Resize Image Online Free – Change Image Dimensions | ElDevo", description: "Resize JPG, PNG and WebP images online for free. Change image width and height while maintaining aspect ratio. No upload required.", alternates: { canonical: "https://eldevo.com/tools/image-resizer/" }, openGraph: { title: "Resize Image Online Free | ElDevo", description: "Resize images locally in your browser.", url: "https://eldevo.com/tools/image-resizer/", type: "website" } };

export default function Page() { return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><header className="mb-7"><span className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Image Tools</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Resize Image Online</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Resize JPG, PNG and WebP images while keeping control over dimensions and output quality. Your image stays in your browser.</p></header><ImageToolWorkspace operation="resize" /></main>; }
