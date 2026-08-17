"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { processImage, type ImageOperation } from "@/lib/engines/image-engine";

type Props = { operation: ImageOperation };
type Format = "image/jpeg" | "image/png" | "image/webp";

const labels: Record<ImageOperation, string> = { resize: "Resize Image", compress: "Compress Image", crop: "Crop Image", convert: "Convert Image", rotate: "Rotate & Flip", editor: "Apply Changes" };

export function ImageToolWorkspace({ operation }: Props) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(""), [resultUrl, setResultUrl] = useState(""), [resultSize, setResultSize] = useState(0);
  const [width, setWidth] = useState(1200), [height, setHeight] = useState(800), [quality, setQuality] = useState(85), [format, setFormat] = useState<Format>("image/webp");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0), [flipX, setFlipX] = useState(false), [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100), [contrast, setContrast] = useState(100), [saturation, setSaturation] = useState(100), [grayscale, setGrayscale] = useState(0), [blur, setBlur] = useState(0), [invert, setInvert] = useState(0), [sepia, setSepia] = useState(0), [hue, setHue] = useState(0), [zoom, setZoom] = useState(100);
  const [cropEnabled, setCropEnabled] = useState(false), [cropX, setCropX] = useState(0), [cropY, setCropY] = useState(0), [cropWidth, setCropWidth] = useState(0), [cropHeight, setCropHeight] = useState(0), [lockAspect, setLockAspect] = useState(false);
  const [dragging, setDragging] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const accept = useMemo(() => "image/jpeg,image/png,image/webp", []);
  const previewFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) blur(${blur}px) invert(${invert}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); if (resultUrl) URL.revokeObjectURL(resultUrl); }, [preview, resultUrl]);

  const choose = useCallback((next: File | undefined) => {
    if (!next) return;
    if (!accept.split(",").includes(next.type)) { setError("Please choose a PNG, JPG or WebP image."); return; }
    setError(""); if (resultUrl) URL.revokeObjectURL(resultUrl); setResultUrl(""); setResultSize(0); if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(next); setFile(next); setPreview(url);
    const image = new Image();
    image.onload = () => { setWidth(image.naturalWidth); setHeight(image.naturalHeight); setCropWidth(image.naturalWidth); setCropHeight(image.naturalHeight); setCropX(0); setCropY(0); };
    image.onerror = () => setError("The browser could not read this image."); image.src = url;
  }, [accept, preview, resultUrl]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => { const pasted = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/")); if (pasted) choose(pasted); };
    window.addEventListener("paste", paste); return () => window.removeEventListener("paste", paste);
  }, [choose]);

  const reset = () => {
    setRotation(0); setFlipX(false); setFlipY(false); setBrightness(100); setContrast(100); setSaturation(100); setGrayscale(0); setBlur(0); setInvert(0); setSepia(0); setHue(0); setZoom(100); setCropEnabled(false); setLockAspect(false); setError("");
    if (file && preview) { const image = new Image(); image.onload = () => { setWidth(image.naturalWidth); setHeight(image.naturalHeight); setCropWidth(image.naturalWidth); setCropHeight(image.naturalHeight); setCropX(0); setCropY(0); }; image.src = preview; }
    if (resultUrl) URL.revokeObjectURL(resultUrl); setResultUrl(""); setResultSize(0);
  };
  const rotateBy = (delta: 90 | -90) => setRotation((current) => ((current + delta + 360) % 360) as 0 | 90 | 180 | 270);
  const setCropPreset = (ratio: number | null) => {
    if (!file || !ratio) { setCropWidth(width); setCropHeight(height); return; }
    let w = width, h = Math.round(w / ratio); if (h > height) { h = height; w = Math.round(h * ratio); }
    setCropX(Math.max(0, Math.round((width - w) / 2))); setCropY(Math.max(0, Math.round((height - h) / 2))); setCropWidth(w); setCropHeight(h); setCropEnabled(true);
  };
  const run = async () => {
    if (!file) return; setBusy(true); setError("");
    try {
      const blob = await processImage(file, { operation, width, height, quality: quality / 100, format, rotation, flipX, flipY, brightness, contrast, saturation, grayscale, blur, invert, sepia, hue, ...(operation === "editor" && cropEnabled ? { x: cropX, y: cropY, cropWidth, cropHeight } : {}) });
      if (resultUrl) URL.revokeObjectURL(resultUrl); setResultUrl(URL.createObjectURL(blob)); setResultSize(blob.size);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to process this image."); } finally { setBusy(false); }
  };
  const download = () => { if (!resultUrl) return; const a = document.createElement("a"); a.href = resultUrl; a.download = `eldevo-image-editor.${format === "image/jpeg" ? "jpg" : format.slice(6)}`; document.body.appendChild(a); a.click(); a.remove(); };
  const drop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); event.stopPropagation(); setDragging(false); choose(event.dataTransfer.files?.[0]); };

  return <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
    <label onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false); }} onDrop={drop} className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${dragging ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-900/70 hover:border-cyan-500/60"}`}>
      <input className="sr-only" type="file" accept={accept} onChange={(e) => choose(e.target.files?.[0])} />
      <span className="text-sm font-semibold text-slate-200">{dragging ? "Release to load image" : "Drop an image here or click to upload"}</span><span className="mt-2 text-xs text-slate-500">PNG, JPG or WebP · up to 25 MB · paste an image from clipboard</span>
    </label>
    {file && <>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-3"><div className="flex min-h-[420px] items-center justify-center overflow-auto"><img src={preview} alt="Selected image preview" className="max-h-[560px] max-w-full object-contain" style={{ filter: previewFilter, transform: `${flipX ? "scaleX(-1)" : ""} ${flipY ? "scaleY(-1)" : ""} rotate(${rotation}deg) scale(${zoom / 100})` }} /></div><div className="mt-3 flex items-center gap-3"><span className="text-xs text-slate-500">Zoom</span><input type="range" min="50" max="200" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" /><span className="w-12 text-right font-mono text-xs text-slate-500">{zoom}%</span></div></div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><Field label="Width" value={width} setValue={setWidth} /><Field label="Height" value={height} setValue={setHeight} /></div>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => rotateBy(-90)} className="btn">↶ Rotate left</button><button type="button" onClick={() => rotateBy(90)} className="btn">↷ Rotate right</button><button type="button" onClick={() => setFlipX((v) => !v)} className={`btn ${flipX ? "active" : ""}`}>↔ Flip H</button><button type="button" onClick={() => setFlipY((v) => !v)} className={`btn ${flipY ? "active" : ""}`}>↕ Flip V</button></div>
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={cropEnabled} onChange={(e) => setCropEnabled(e.target.checked)} /> Enable crop</label>
          <div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => setCropPreset(1)} className="btn">1:1</button><button type="button" onClick={() => setCropPreset(16 / 9)} className="btn">16:9</button><button type="button" onClick={() => setCropPreset(4 / 3)} className="btn">4:3</button></div>
          {cropEnabled && <div className="grid grid-cols-2 gap-3"><Field label="Crop X" value={cropX} setValue={setCropX} /><Field label="Crop Y" value={cropY} setValue={setCropY} /><Field label="Crop width" value={cropWidth} setValue={setCropWidth} min={1} /><Field label="Crop height" value={cropHeight} setValue={setCropHeight} min={1} /></div>}
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} /> Lock crop aspect ratio</label>
          <Slider label="Brightness" value={brightness} setValue={setBrightness} min={0} max={200} suffix="%" /><Slider label="Contrast" value={contrast} setValue={setContrast} min={0} max={200} suffix="%" /><Slider label="Saturation" value={saturation} setValue={setSaturation} min={0} max={200} suffix="%" /><Slider label="Grayscale" value={grayscale} setValue={setGrayscale} min={0} max={100} suffix="%" /><Slider label="Blur" value={blur} setValue={setBlur} min={0} max={20} suffix="px" /><Slider label="Invert" value={invert} setValue={setInvert} min={0} max={100} suffix="%" /><Slider label="Sepia" value={sepia} setValue={setSepia} min={0} max={100} suffix="%" /><Slider label="Hue" value={hue} setValue={setHue} min={-180} max={180} suffix="°" />
          <div className="grid grid-cols-2 gap-3"><Slider label="Quality" value={quality} setValue={setQuality} min={10} max={100} suffix="%" /><label className="block text-xs text-slate-400">Output format<select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label></div>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={reset} className="btn">Reset</button><button type="button" onClick={run} disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Processing…" : labels[operation]}</button></div>
        </div>
      </div>
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {resultUrl && <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">Result · {(resultSize / 1024).toFixed(0)} KB</span><button type="button" onClick={download} className="rounded-lg border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-300">Download image</button></div><img src={resultUrl} alt="Edited image preview" className="mx-auto mt-4 max-h-[560px] max-w-full object-contain" /></div>}
    </>}
    <style jsx>{`.btn{border:1px solid rgb(51 65 85);border-radius:.5rem;padding:.65rem .75rem;font-size:.75rem;color:rgb(203 213 225)}.btn:hover{border-color:rgb(6 182 212)}.btn.active{border-color:rgb(6 182 212);color:rgb(103 232 249)}`}</style>
  </section>;
}

function Field({ label, value, setValue, min = 0, max = 40000 }: { label: string; value: number; setValue: (value: number) => void; min?: number; max?: number }) { return <label className="block text-xs text-slate-400">{label}<input type="number" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200" /></label>; }
function Slider({ label, value, setValue, min, max, suffix }: { label: string; value: number; setValue: (value: number) => void; min: number; max: number; suffix: string }) { return <label className="block text-xs text-slate-400">{label}<div className="mt-1 flex items-center gap-2"><input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full" /><span className="w-12 text-right font-mono text-[11px] text-slate-500">{value}{suffix}</span></div></label>; }
