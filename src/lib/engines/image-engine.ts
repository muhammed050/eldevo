import type { ToolEngine } from "./shared";

export type ImageOperation = "resize" | "compress" | "crop" | "convert" | "rotate";

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
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    const drawW = options.operation === "resize" ? outW : sw;
    const drawH = options.operation === "resize" ? outH : sh;
    ctx.drawImage(bitmap, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The browser could not export the image."))), format, format === "image/png" ? undefined : quality);
    });
  } finally {
    bitmap.close();
  }
}

export const run: ToolEngine = async (input) => {
  throw new Error("Image tools require a local File and use the image workspace.");
};
