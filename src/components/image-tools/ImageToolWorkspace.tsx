"use client";

import { useEffect, useMemo, useState } from "react";
import { processImage, type ImageOperation } from "@/lib/engines/image-engine";

type Props = { operation: ImageOperation };
type Format = "image/jpeg" | "image/png" | "image/webp";

const labels: Record<ImageOperation, string> = {
  resize: "Resize Image",
  compress: "Compress Image",
  crop: "Crop Image",
  convert: "Convert Image",
  rotate: "Rotate & Flip",
  editor: "Apply Changes",
};

export function ImageToolWorkspace({ operation }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultSize, setResultSize] = useState(0);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [quality, setQuality] = useState(85);
  const [format, setFormat] = useState<Format>("image/webp");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [blur, setBlur] = useState(0);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(0);
  const [cropHeight, setCropHeight] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const accept = useMemo(() => "image/jpeg,image/png,image/webp", []);
  const previewFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) blur(${blur}px)`;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [preview, resultUrl]);

  const reset = () => {
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGrayscale(0);
    setBlur(0);
    setCropEnabled(false);
    if (file) {
      const image = new Image();
      image.onload = () => {
        setWidth(image.naturalWidth);
        setHeight(image.naturalHeight);
        setCropWidth(image.naturalWidth);
        setCropHeight(image.naturalHeight);
      };
      image.src = preview;
    }
    setError("");
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl("");
      setResultSize(0);
    }
  };

  const choose = (next: File | undefined) => {
    if (!next) return;
    setError("");
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl("");
    setResultSize(0);
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(next);
    setFile(next);
    setPreview(url);

    const image = new Image();
    image.onload = () => {
      setWidth(image.naturalWidth);
      setHeight(image.naturalHeight);
      setCropWidth(image.naturalWidth);
      setCropHeight(image.naturalHeight);
      setCropX(0);
      setCropY(0);
    };
    image.src = url;
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await processImage(file, {
        operation,
        width,
        height,
        quality: quality / 100,
        format,
        rotation,
        flipX,
        flipY,
        brightness,
        contrast,
        saturation,
        grayscale,
        blur,
        ...(operation === "editor" && cropEnabled
          ? { x: cropX, y: cropY, cropWidth, cropHeight }
          : {}),
      });
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
    a.download = `eldevo-image-editor.${format === "image/jpeg" ? "jpg" : format.slice(6)}`;
    a.click();
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-center transition hover:border-cyan-500/60">
        <input className="sr-only" type="file" accept={accept} onChange={(e) => choose(e.target.files?.[0])} />
        <span className="text-sm font-semibold text-slate-200">Drop an image here or click to upload</span>
        <span className="mt-2 text-xs text-slate-500">PNG, JPG or WebP · up to 25 MB · processed locally</span>
      </label>

      {file && (
        <>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3">
              <img src={preview} alt="Selected image preview" className="mx-auto max-h-[560px] max-w-full object-contain" style={{ filter: previewFilter, transform: `${flipX ? "scaleX(-1)" : ""} ${flipY ? "scaleY(-1)" : ""} rotate(${rotation}deg)` }} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width" value={width} setValue={setWidth} />
                <Field label="Height" value={height} setValue={setHeight} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([90, 180, 270] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setRotation(value)} className={`rounded-lg border px-3 py-2 text-xs ${rotation === value ? "border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-300"}`}>{value}°</button>
                ))}
                <button type="button" onClick={() => setFlipX((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs ${flipX ? "border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-300"}`}>↔ Flip H</button>
                <button type="button" onClick={() => setFlipY((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs ${flipY ? "border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-300"}`}>↕ Flip V</button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={cropEnabled} onChange={(e) => setCropEnabled(e.target.checked)} />
                Enable crop
              </label>
              {cropEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Crop X" value={cropX} setValue={setCropX} min={0} />
                  <Field label="Crop Y" value={cropY} setValue={setCropY} min={0} />
                  <Field label="Crop width" value={cropWidth} setValue={setCropWidth} min={1} />
                  <Field label="Crop height" value={cropHeight} setValue={setCropHeight} min={1} />
                </div>
              )}

              <Slider label="Brightness" value={brightness} setValue={setBrightness} min={0} max={200} suffix="%" />
              <Slider label="Contrast" value={contrast} setValue={setContrast} min={0} max={200} suffix="%" />
              <Slider label="Saturation" value={saturation} setValue={setSaturation} min={0} max={200} suffix="%" />
              <Slider label="Grayscale" value={grayscale} setValue={setGrayscale} min={0} max={100} suffix="%" />
              <Slider label="Blur" value={blur} setValue={setBlur} min={0} max={20} suffix="px" />

              <Slider label="Quality" value={quality} setValue={setQuality} min={10} max={100} suffix="%" />
              <label className="block text-xs text-slate-400">Output format<select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300">Reset</button>
                <button type="button" onClick={run} disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Processing…" : labels[operation]}</button>
              </div>
            </div>
          </div>

          {error && <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          {resultUrl && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">Result · {(resultSize / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={download} className="rounded-lg border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-300">Download image</button>
              </div>
              <img src={resultUrl} alt="Edited image preview" className="mx-auto mt-4 max-h-[560px] max-w-full object-contain" />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Field({ label, value, setValue, min = 0, max = 40000 }: { label: string; value: number; setValue: (value: number) => void; min?: number; max?: number }) {
  return <label className="block text-xs text-slate-400">{label}<input type="number" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200" /></label>;
}

function Slider({ label, value, setValue, min, max, suffix }: { label: string; value: number; setValue: (value: number) => void; min: number; max: number; suffix: string }) {
  return <label className="block text-xs text-slate-400">{label}<div className="mt-1 flex items-center gap-2"><input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full" /><span className="w-12 text-right font-mono text-[11px] text-slate-500">{value}{suffix}</span></div></label>;
}
