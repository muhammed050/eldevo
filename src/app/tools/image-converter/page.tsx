import type { Metadata } from "next";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";

export const metadata: Metadata = { title: "Image Converter Online – JPG, PNG & WebP | ElDevo", description: "Convert images between JPG, PNG and WebP formats online for free. Your images are processed directly in your browser.", alternates: { canonical: "https://eldevo.com/tools/image-converter/" }, openGraph: { title: "Image Converter Online | ElDevo", description: "Convert JPG, PNG and WebP images locally.", url: "https://eldevo.com/tools/image-converter/", type: "website" } };

export default function Page() { return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><header className="mb-7"><span className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Image Tools</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Image Converter Online</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Convert JPG, PNG and WebP images directly in your browser, with no server upload.</p></header><ImageToolWorkspace operation="convert" /></main>; }
