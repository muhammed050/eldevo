const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
type Format = "image/jpeg" | "image/png" | "image/webp";

function validate(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please choose a PNG, JPG or WebP image.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Image is larger than the 25 MB limit.");
}

async function bitmap(file: File): Promise<ImageBitmap> {
  validate(file);
  const image = await createImageBitmap(file);
  if (image.width * image.height > MAX_PIXELS) {
    image.close();
    throw new Error("Image dimensions are too large for browser processing.");
  }
  return image;
}

function exportCanvas(canvas: HTMLCanvasElement, format: Format, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not export the image.")), format, format === "image/png" ? undefined : quality));
}

export async function upscaleImage(file: File, scale: 2 | 4, format: Format, quality: number) {
  const source = await bitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(12000, source.width * scale);
    canvas.height = Math.min(12000, source.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not create a Canvas context.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return exportCanvas(canvas, format, quality);
  } finally { source.close(); }
}

export async function compressImage(file: File, format: Format, quality: number, maxWidth?: number) {
  const source = await bitmap(file);
  try {
    let width = source.width;
    let height = source.height;
    if (maxWidth && width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not create a Canvas context.");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    if (format === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); }
    ctx.drawImage(source, 0, 0, width, height);
    return exportCanvas(canvas, format, quality);
  } finally { source.close(); }
}

function colorDistance(r: number, g: number, b: number, cr: number, cg: number, cb: number) {
  return Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
}

export async function removeBackground(file: File, tolerance = 42) {
  const source = await bitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Your browser could not create a Canvas context.");
    ctx.drawImage(source, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = data.data;
    const samples: [number, number, number][] = [];
    const points = [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1],[Math.floor(canvas.width/2),0],[0,Math.floor(canvas.height/2)]];
    for (const [x,y] of points) { const i = (y * canvas.width + x) * 4; samples.push([p[i],p[i+1],p[i+2]]); }
    const bg = samples.reduce((a, b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]] as [number,number,number], [0,0,0]).map(v => v / samples.length) as [number,number,number];
    for (let i = 0; i < p.length; i += 4) {
      const d = colorDistance(p[i],p[i+1],p[i+2],bg[0],bg[1],bg[2]);
      if (d <= tolerance) p[i+3] = 0;
      else if (d <= tolerance + 18) p[i+3] = Math.round(((d - tolerance) / 18) * p[i+3]);
    }
    ctx.putImageData(data, 0, 0);
    return exportCanvas(canvas, "image/png");
  } finally { source.close(); }
}

export async function socialResize(file: File, width: number, height: number, fit: "cover" | "contain", background: string, format: Format, quality: number) {
  const source = await bitmap(file);
  try {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser could not create a Canvas context.");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = background; ctx.fillRect(0,0,width,height);
    const scale = fit === "cover" ? Math.max(width/source.width, height/source.height) : Math.min(width/source.width, height/source.height);
    const dw = Math.round(source.width * scale), dh = Math.round(source.height * scale);
    ctx.drawImage(source, Math.round((width-dw)/2), Math.round((height-dh)/2), dw, dh);
    return exportCanvas(canvas, format, quality);
  } finally { source.close(); }
}

function pageSize(name: "A4" | "A5" | "Letter", landscape: boolean) {
  const sizes: Record<string,[number,number]> = { A4:[595,842], A5:[420,595], Letter:[612,792] };
  const [w,h] = sizes[name]; return landscape ? [h,w] : [w,h];
}

function ascii(s: string) { return new TextEncoder().encode(s); }
function join(parts: Uint8Array[]) { const total = parts.reduce((n,p) => n+p.length,0); const out = new Uint8Array(total); let at=0; for (const p of parts) { out.set(p,at); at+=p.length; } return out; }

export async function imagesToPdf(files: File[], size: "A4" | "A5" | "Letter", landscape: boolean, margin: number) {
  if (!files.length) throw new Error("Add at least one image.");
  if (files.length > 30) throw new Error("You can add up to 30 images at once.");
  const [pageW,pageH] = pageSize(size, landscape);
  const objects: Uint8Array[] = [];
  const add = (body: Uint8Array) => { objects.push(body); return objects.length; };
  const pagesId = add(new Uint8Array());
  const pageIds: number[] = [];
  for (const file of files) {
    const source = await bitmap(file);
    try {
      const canvas = document.createElement("canvas"); canvas.width=source.width; canvas.height=source.height;
      const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Canvas unavailable.");
      ctx.drawImage(source,0,0);
      const jpeg = await exportCanvas(canvas,"image/jpeg",0.9);
      const bytes = new Uint8Array(await jpeg.arrayBuffer());
      const b64 = await new Promise<string>((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result).split(",")[1] ?? ""); r.onerror=()=>reject(new Error("Could not encode image.")); r.readAsDataURL(jpeg); });
      const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const imageId = add(join([ascii(`<< /Type /XObject /Subtype /Image /Width ${source.width} /Height ${source.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\nstream\n`), binary, ascii("\nendstream")]));
      const scale = Math.min((pageW-2*margin)/source.width,(pageH-2*margin)/source.height);
      const dw=source.width*scale, dh=source.height*scale, x=(pageW-dw)/2, y=(pageH-dh)/2;
      const contentId = add(ascii(`<< /Length ${(`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q\n`).length} >>\nstream\nq ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q\nendstream`));
      const pageId = add(ascii(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
      pageIds.push(pageId);
    } finally { source.close(); }
  }
  objects[pagesId-1] = ascii(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalogId = add(ascii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
  const header = ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const chunks: Uint8Array[] = [header]; const offsets=[0]; let offset=header.length;
  for(let i=0;i<objects.length;i++){ const body=objects[i]; const obj=join([ascii(`${i+1} 0 obj\n`),body,ascii("\nendobj\n")]); offsets.push(offset); chunks.push(obj); offset+=obj.length; }
  const xrefOffset=offset; let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objects.length;i++) xref += `${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(ascii(xref));
  return new Blob(
  chunks.map((chunk) => {
    const buffer = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(buffer).set(chunk);
    return buffer;
  }),
  { type: "application/pdf" }
);
}
