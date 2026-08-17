"use client";

import { useMemo, useState } from "react";
import { processImage, type ImageOperation } from "@/lib/engines/image-engine";

type Props = { operation: ImageOperation };
const labels: Record<ImageOperation, string> = { resize: "Resize Image", compress: "Compress Image", crop: "Crop Image", convert: "Convert Image", rotate: "Rotate & Flip" };

export function ImageToolWorkspace({ operation }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultSize, setResultSize] = useState(0);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [quality, setQuality] = useState(85);
  const [format, setFormat] = useState<"image/jpeg" | "image/png" | "image/webp">("image/webp");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const accept = useMemo(() => "image/jpeg,image/png,image/webp,image/gif,image/bmp", []);
  const choose = (next: File | undefined) => {
    if (!next) return;
    setError("");
    setResultUrl("");
    setResultSize(0);
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    const nextPreview = URL.createObjectURL(next);
    setPreview(nextPreview);
    const image = new Image();
    image.onload = () => {
      setWidth(image.naturalWidth);
      setHeight(image.naturalHeight);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(next);
  };
  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await processImage(file, { operation, width, height, quality: quality / 100, format, x: 0, y: 0, cropWidth: width, cropHeight: height, rotation, flipX, flipY });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultSize(blob.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process this image.");
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `eldevo-${operation}.${format === "image/jpeg" ? "jpg" : format.slice(6)}`;
    a.click();
  };

  return <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-center hover:border-cyan-500/60">
      <input className="sr-only" type="file" accept={accept} onChange={(e) => choose(e.target.files?.[0])} />
      <span className="text-sm font-semibold text-slate-200">Drop an image here or click to upload</span>
      <span className="mt-2 text-xs text-slate-500">JPG, PNG or WebP · up to 25 MB · processed locally</span>
    </label>
    {file && <>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3"><img src={preview} alt="Selected image preview" className="mx-auto max-h-[520px] max-w-full object-contain" /></div>
        <div className="space-y-4">
          {operation === "resize" && <div className="grid grid-cols-2 gap-3"><Field label="Width" value={width} setValue={setWidth} /><Field label="Height" value={height} setValue={setHeight} /></div>}
          {operation === "crop" && <div className="grid grid-cols-2 gap-3"><Field label="Width" value={width} setValue={setWidth} /><Field label="Height" value={height} setValue={setHeight} /></div>}
          {operation === "compress" && <p className="text-xs text-slate-500">Compression keeps the original dimensions.</p>}
          {operation === "rotate" && <div className="grid grid-cols-2 gap-2">{([90, 180, 270] as const).map((r) => <button key={r} onClick={() => setRotation(r)} className={`rounded-lg border px-3 py-2 text-xs ${rotation === r ? "border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-300"}`}>{r}°</button>)}</div>}
          {operation === "rotate" && <div className="grid grid-cols-2 gap-2"><button onClick={() => setFlipX(!flipX)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">↔ Flip X</button><button onClick={() => setFlipY(!flipY)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">↕ Flip Y</button></div>}
          {operation !== "resize" && operation !== "crop" && <Field label="Quality" value={quality} setValue={setQuality} min={10} max={100} />}
          <label className="block text-xs text-slate-400">Output format<select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label>
          <button onClick={run} disabled={busy} className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Processing…" : labels[operation]}</button>
        </div>
      </div>
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {resultUrl && <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">Result · {(resultSize / 1024).toFixed(0)} KB{file.size ? ` · ${Math.max(0, Math.round((1 - resultSize / file.size) * 100))}% size change` : ""}</span><button onClick={download} className="rounded-lg border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-300">Download image</button></div><img src={resultUrl} alt="Processed image preview" className="mx-auto mt-4 max-h-[520px] max-w-full object-contain" /></div>}
    </>}
  </section>;
}

function Field({ label, value, setValue, min = 1, max = 40000 }: { label: string; value: number; setValue: (n: number) => void; min?: number; max?: number }) { return <label className="block text-xs text-slate-400">{label}<input type="number" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200" /></label>; }
