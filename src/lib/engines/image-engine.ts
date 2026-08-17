import type { ToolEngine } from "./shared";

export type ImageOperation = "resize" | "compress" | "crop" | "convert" | "rotate" | "editor";

export type ImageOptions = {
  operation: ImageOperation;
  width?: number;
  height?: number;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
  x?: number;
  y?: number;
  cropWidth?: number;
  cropHeight?: number;
  rotation?: 0 | 90 | 180 | 270;
  flipX?: boolean;
  flipY?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  blur?: number;
  invert?: number;
  sepia?: number;
  hue?: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

export async function processImage(file: File, options: ImageOptions): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a valid image file.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Image is larger than the 25 MB limit.");

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("Image dimensions are too large. Please resize it first.");

    const format = options.format ?? (file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg");
    const quality = Math.min(1, Math.max(0.1, options.quality ?? 0.85));
    const sourceW = bitmap.width;
    const sourceH = bitmap.height;
    let outW = sourceW;
    let outH = sourceH;
    let sx = 0;
    let sy = 0;
    let sw = sourceW;
    let sh = sourceH;

    if (options.operation === "resize") {
      outW = Math.max(1, Math.round(options.width ?? sourceW));
      outH = Math.max(1, Math.round(options.height ?? sourceH));
    }

    if (options.operation === "crop") {
      sx = Math.max(0, Math.min(sourceW - 1, Math.round(options.x ?? 0)));
      sy = Math.max(0, Math.min(sourceH - 1, Math.round(options.y ?? 0)));
      sw = Math.max(1, Math.min(sourceW - sx, Math.round(options.cropWidth ?? sourceW)));
      sh = Math.max(1, Math.min(sourceH - sy, Math.round(options.cropHeight ?? sourceH)));
      outW = sw;
      outH = sh;
    }

    if (options.operation === "editor") {
      const cropRequested = options.cropWidth !== undefined || options.cropHeight !== undefined || options.x !== undefined || options.y !== undefined;
      if (cropRequested) {
        sx = Math.max(0, Math.min(sourceW - 1, Math.round(options.x ?? 0)));
        sy = Math.max(0, Math.min(sourceH - 1, Math.round(options.y ?? 0)));
        sw = Math.max(1, Math.min(sourceW - sx, Math.round(options.cropWidth ?? sourceW)));
        sh = Math.max(1, Math.min(sourceH - sy, Math.round(options.cropHeight ?? sourceH)));
      }
      if (options.width && options.height) {
        outW = Math.max(1, Math.round(options.width));
        outH = Math.max(1, Math.round(options.height));
      } else {
        outW = sw;
        outH = sh;
      }
    }

    const rotation = options.rotation ?? 0;
    if (rotation === 90 || rotation === 270) [outW, outH] = [outH, outW];

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not create a Canvas context.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }

    const brightness = Math.max(0, options.brightness ?? 100);
    const contrast = Math.max(0, options.contrast ?? 100);
    const saturation = Math.max(0, options.saturation ?? 100);
    const grayscale = Math.min(100, Math.max(0, options.grayscale ?? 0));
    const blur = Math.max(0, options.blur ?? 0);
    const invert = Math.min(100, Math.max(0, options.invert ?? 0));
    const sepia = Math.min(100, Math.max(0, options.sepia ?? 0));
    const hue = Math.max(-360, Math.min(360, options.hue ?? 0));
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) blur(${blur}px) invert(${invert}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);

    const drawW = options.operation === "resize" || (options.operation === "editor" && options.width && options.height) ? outW : sw;
    const drawH = options.operation === "resize" || (options.operation === "editor" && options.width && options.height) ? outH : sh;
    ctx.drawImage(bitmap, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The browser could not export the image."))), format, format === "image/png" ? undefined : quality);
    });
  } finally {
    bitmap.close();
  }
}

export const run: ToolEngine = async () => {
  throw new Error("Image tools require a local File and use the image workspace.");
};
