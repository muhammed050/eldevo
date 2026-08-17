"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { compressImage, imagesToPdf, removeBackground, socialResize, upscaleImage } from "@/lib/engines/image-suite-engine";

type EngineFormat = "image/jpeg" | "image/png" | "image/webp";
type Tool = "background-remover" | "image-upscaler" | "image-compressor-pro" | "social-media-image-resizer" | "image-to-pdf";

type Props = { tool: Tool };

interface FileWithPreview {
  file: File;
  previewUrl: string;
}

const accepts = "image/jpeg,image/png,image/webp";
const presets: Record<string, [number, number]> = {
  "instagram-square": [1080, 1080], 
  "instagram-portrait": [1080, 1350], 
  "instagram-story": [1080, 1920],
  "tiktok": [1080, 1920], 
  "youtube-thumbnail": [1280, 720], 
  "facebook-post": [1200, 630], 
  "x-post": [1600, 900], 
  "linkedin-post": [1200, 627],
  "pinterest-pin": [1000, 1500],
  "twitter-header": [1500, 500],
};

export function ImageSuiteWorkspace({ tool }: Props) {
  const [items, setItems] = useState<FileWithPreview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [compareSlider, setCompareSlider] = useState(50);
  
  const resultUrlRef = useRef<string>("");

  // Settings States
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<EngineFormat>("image/webp");
  const [scale, setScale] = useState<2 | 4>(2);
  const [tolerance, setTolerance] = useState(42);
  const [maxWidth, setMaxWidth] = useState(0);
  const [preset, setPreset] = useState("instagram-square");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [background, setBackground] = useState("#ffffff");
  const [pdfSize, setPdfSize] = useState<"A4" | "A5" | "Letter">("A4");
  const [landscape, setLandscape] = useState(false);
  const [margin, setMargin] = useState(24);

  const title = useMemo(() => ({
    "background-remover": "Background Remover",
    "image-upscaler": "Image Upscaler",
    "image-compressor-pro": "Image Compressor Pro",
    "social-media-image-resizer": "Social Media Image Resizer",
    "image-to-pdf": "Image to PDF",
  }[tool]), [tool]);

  // تنظيف الروابط عند الحذف أو الخروج
  const cleanupItems = useCallback((itemsToClean: FileWithPreview[]) => {
    itemsToClean.forEach(item => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const cleanupResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResultUrl("");
    setResultName("");
    setResultSize(null);
  }, []);

  useEffect(() => {
    return () => {
      items.forEach(item => URL.revokeObjectURL(item.previewUrl));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const choose = useCallback((incoming: File[]) => {
    const valid = incoming.filter((file) => accepts.split(",").includes(file.type) && file.size <= 25 * 1024 * 1024);
    if (!valid.length) { setError("Please choose valid PNG, JPG, or WebP files up to 25 MB each."); return; }
    
    setError(""); 
    cleanupResult();

    const selectedFiles = tool === "image-to-pdf" ? valid.slice(0, 30) : [valid[0]];
    
    // إنشاء روابط المعاينة الصغرى للصورة المرفوعة
    const newItems: FileWithPreview[] = selectedFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setItems(prev => {
      cleanupItems(prev);
      return newItems;
    });
  }, [cleanupResult, cleanupItems, tool]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => { 
      const image = Array.from(event.clipboardData?.files ?? []).find((f) => accepts.split(",").includes(f.type)); 
      if (image) choose([image]); 
    };
    window.addEventListener("paste", paste); 
    return () => window.removeEventListener("paste", paste);
  }, [choose]);

  const drop = (event: DragEvent<HTMLLabelElement>) => { 
    event.preventDefault(); 
    event.stopPropagation(); 
    setDragging(false); 
    choose(Array.from(event.dataTransfer.files ?? [])); 
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const run = async () => {
    if (!items.length) { setError("Add an image first."); return; }
    setBusy(true); 
    setError(""); 

    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResultUrl("");
    setResultName("");
    
    try {
      let blob: Blob;
      let name: string;
      const rawFiles = items.map(item => item.file);

      if (tool === "background-remover") { 
        blob = await removeBackground(rawFiles[0], tolerance); 
        name = "eldevo-background-removed.png"; 
      }
      else if (tool === "image-upscaler") { 
        blob = await upscaleImage(rawFiles[0], scale, format, quality / 100); 
        name = `eldevo-upscaled.${extension(format)}`; 
      }
      else if (tool === "image-compressor-pro") { 
        blob = await compressImage(rawFiles[0], format, quality / 100, maxWidth || undefined); 
        name = `eldevo-compressed.${extension(format)}`; 
      }
      else if (tool === "social-media-image-resizer") { 
        const [w, h] = presets[preset]; 
        blob = await socialResize(rawFiles[0], w, h, fit, background, format, quality / 100); 
        name = `eldevo-${preset}.${extension(format)}`; 
      }
      else { 
        blob = await imagesToPdf(rawFiles, pdfSize, landscape, margin); 
        name = "eldevo-images.pdf"; 
      }
      
      const newResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = newResultUrl;
      
      setResultSize(blob.size);
      setResultUrl(newResultUrl); 
      setResultName(name);
    } catch (e) { 
      setError(e instanceof Error ? e.message : "Unable to process the image."); 
    } finally { 
      setBusy(false); 
    }
  };

  const download = () => { 
    if (!resultUrl) return; 
    const a = document.createElement("a"); 
    a.href = resultUrl; 
    a.download = resultName; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
  };

  const reset = () => { 
    cleanupItems(items);
    cleanupResult();
    setItems([]); 
    setError(""); 
    setQuality(82); 
    setScale(2); 
    setTolerance(42); 
    setMaxWidth(0); 
    setPreset("instagram-square"); 
    setFit("cover"); 
    setBackground("#ffffff"); 
    setPdfSize("A4"); 
    setLandscape(false); 
    setMargin(24); 
  };

  const originalSizeSum = useMemo(() => items.reduce((acc, item) => acc + item.file.size, 0), [items]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
      {/* منطقة الرفع */}
      <label 
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} 
        onDragOver={(e) => e.preventDefault()} 
        onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false); }} 
        onDrop={drop} 
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${dragging ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-900/70 hover:border-cyan-500/60"}`}
      >
        <input className="sr-only" type="file" multiple={tool === "image-to-pdf"} accept={accepts} onChange={(e) => choose(Array.from(e.target.files ?? []))} />
        <span className="text-sm font-semibold text-slate-200">
          {dragging ? "Release to load image" : tool === "image-to-pdf" ? "Drop images here or click to upload" : "Drop an image here or click to upload"}
        </span>
        <span className="mt-2 text-xs text-slate-500">PNG, JPG or WebP · browser-only processing · paste supported</span>
      </label>

      {/* عرض الصور المرفوعة (Thumbnails) */}
      {items.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-400">
              {items.length} image{items.length === 1 ? "" : "s"} selected (Total: {(originalSizeSum / 1024 / 1024).toFixed(2)} MB)
            </span>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">Clear All</button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {items.map((item, idx) => (
              <div key={`${item.file.name}-${item.file.lastModified}-${idx}`} className="relative flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-2">
                <img 
                  src={item.previewUrl} 
                  alt={item.file.name} 
                  className="h-14 w-14 rounded-md object-cover border border-slate-700 shrink-0" 
                />
                
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{item.file.name}</p>
                  <p className="text-[11px] text-slate-500">{(item.file.size / 1024).toFixed(0)} KB</p>
                </div>

                {tool === "image-to-pdf" && items.length > 1 && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="px-1 py-0.2 rounded border border-slate-700 text-[10px] hover:bg-slate-800 disabled:opacity-20">↑</button>
                    <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="px-1 py-0.2 rounded border border-slate-700 text-[10px] hover:bg-slate-800 disabled:opacity-20">↓</button>
                    <button type="button" onClick={() => removeItem(idx)} className="px-1 py-0.2 rounded border border-red-500/30 text-red-400 text-[10px] hover:bg-red-500/20">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* خيارات التحكم */}
      {items.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {tool === "background-remover" && (
            <div>
              <Slider label="Background tolerance" value={tolerance} setValue={setTolerance} min={10} max={100} suffix="" />
              <p className="mt-2 text-xs text-slate-500">Corner-color detection processed locally. Adjust tolerance for solid backgrounds.</p>
            </div>
          )}

          {tool === "image-upscaler" && (
            <>
              <Select label="Scale" value={String(scale)} setValue={(v) => setScale(Number(v) as 2 | 4)} options={[["2", "2×"], ["4", "4×"]]} />
              <Select label="Output format" value={format} setValue={(v) => setFormat(v as EngineFormat)} options={[["image/webp", "WebP"], ["image/jpeg", "JPG"], ["image/png", "PNG"]]} />
              <Slider label="Quality" value={quality} setValue={setQuality} min={40} max={100} suffix="%" />
            </>
          )}

          {tool === "image-compressor-pro" && (
            <>
              <Select label="Output format" value={format} setValue={(v) => setFormat(v as EngineFormat)} options={[["image/webp", "WebP"], ["image/jpeg", "JPG"], ["image/png", "PNG"]]} />
              <Slider label="Quality" value={quality} setValue={setQuality} min={10} max={100} suffix="%" />
              <Field label="Max width (optional)" value={maxWidth} setValue={setMaxWidth} min={0} max={12000} />
              <p className="text-xs text-slate-500 col-span-full">Lower pixel dimensions alongside quality optimization to maximize file savings.</p>
            </>
          )}

          {tool === "social-media-image-resizer" && (
            <>
              <Select label="Platform preset" value={preset} setValue={setPreset} options={Object.entries(presets).map(([k, [w, h]]) => [k, `${pretty(k)} — ${w}×${h}`])} />
              <Select label="Fit mode" value={fit} setValue={(v) => setFit(v as "cover" | "contain")} options={[["cover", "Cover / crop"], ["contain", "Contain / letterbox"]]} />
              <Select label="Output format" value={format} setValue={(v) => setFormat(v as EngineFormat)} options={[["image/webp", "WebP"], ["image/jpeg", "JPG"], ["image/png", "PNG"]]} />
              <label className="block text-xs text-slate-400">
                Background Canvas Color
                <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 p-1 cursor-pointer" />
              </label>
            </>
          )}

          {tool === "image-to-pdf" && (
            <>
              <Select label="Page size" value={pdfSize} setValue={(v) => setPdfSize(v as "A4" | "A5" | "Letter")} options={[["A4", "A4"], ["A5", "A5"], ["Letter", "Letter"]]} />
              <label className="flex items-center gap-2 text-sm text-slate-300 mt-5">
                <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} className="rounded border-slate-700 bg-slate-900" /> Landscape Orientation
              </label>
              <Field label="Page Margin (pt)" value={margin} setValue={setMargin} min={0} max={100} />
              <p className="text-xs text-slate-500 col-span-full">Up to 30 images combined into a single high-quality PDF document.</p>
            </>
          )}
        </div>
      )}

      {/* أزرار المعالجة */}
      {items.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={run} disabled={busy} className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
            {busy ? "Processing…" : `Run ${title}`}
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Reset</button>
        </div>
      )}

      {error && <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {/* عرض النتيجة ومقارنة الصور */}
      {resultUrl && (
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/10 pb-4">
            <div>
              <p className="text-sm font-semibold text-emerald-300">Ready for download</p>
              <p className="text-xs text-slate-400">{resultName}</p>
              
              {resultSize && items[0] && (
                <div className="mt-1 text-xs text-slate-300 flex gap-2">
                  <span>New Size: <strong>{(resultSize / 1024).toFixed(1)} KB</strong></span>
                  {tool === "image-compressor-pro" && (
                    <span className="text-emerald-400 font-medium">
                      ({(((items[0].file.size - resultSize) / items[0].file.size) * 100).toFixed(1)}% reduction)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <button type="button" onClick={download} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300">Download Result</button>
          </div>

          {/* المعاينة التفاعلية والمقارنة */}
          {tool !== "image-to-pdf" && items[0] && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2 font-medium">Preview Comparison (Slide to compare Original vs Result):</p>
              <div className="relative h-[350px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                <img src={resultUrl} alt="Processed" className="absolute inset-0 h-full w-full object-contain" />
                
                <div 
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-cyan-400 bg-slate-950" 
                  style={{ width: `${compareSlider}%` }}
                >
                  <img src={itemPreviewUrl(items[0])} alt="Original" className="h-full max-w-none object-contain" style={{ width: "100%", height: "100%" }} />
                </div>

                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={compareSlider} 
                  onChange={(e) => setCompareSlider(Number(e.target.value))} 
                  className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function itemPreviewUrl(item?: FileWithPreview) {
  return item ? item.previewUrl : "";
}

function extension(format: EngineFormat) { 
  if (format === "image/jpeg") return "jpg";
  return format.slice(6); 
}

function pretty(value: string) { 
  return value.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()); 
}

function Field({ label, value, setValue, min = 0, max = 40000 }: { label: string; value: number; setValue: (v: number) => void; min?: number; max?: number }) { 
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200" />
    </label>
  ); 
}

function Slider({ label, value, setValue, min, max, suffix }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; suffix: string }) { 
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-cyan-400" />
        <span className="w-12 text-right font-mono text-[11px] text-slate-500">{value}{suffix}</span>
      </div>
    </label>
  ); 
}

function Select({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[][] }) { 
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200">
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  ); 
}
