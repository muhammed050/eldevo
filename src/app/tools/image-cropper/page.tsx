import type { Metadata } from "next";
import { ImageToolWorkspace } from "@/components/image-tools/ImageToolWorkspace";

export const metadata: Metadata = { title: "Crop Image Online Free – JPG, PNG & WebP | ElDevo", description: "Crop images online for free. Set custom output dimensions and export JPG, PNG or WebP locally in your browser.", alternates: { canonical: "https://eldevo.com/tools/image-cropper/" }, openGraph: { title: "Crop Image Online Free | ElDevo", description: "Crop images privately in your browser.", url: "https://eldevo.com/tools/image-cropper/", type: "website" } };

export default function Page() { return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><header className="mb-7"><span className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Image Tools</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Crop Image Online</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Crop your image to custom dimensions and export it without sending the original file to ElDevo.</p></header><ImageToolWorkspace operation="crop" /></main>; }
