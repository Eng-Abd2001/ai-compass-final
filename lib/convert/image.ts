import { blobOf, bytesOf, enc, u16, u32 } from "./bytes";
import { encodeBmp } from "./bmp";
import { encodeGif } from "./gif";
import type { Kind } from "./sniff";
import type { ZipFile } from "./zip";

export type ImgFmt = "png" | "jpeg" | "webp" | "avif" | "bmp" | "gif" | "ico";
export const IMG_FMTS: readonly ImgFmt[] = ["png", "jpeg", "webp", "avif", "bmp", "gif", "ico"];
export const FMT_MIME: Record<ImgFmt, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", gif: "image/gif", ico: "image/x-icon" };
export const FMT_EXT: Record<ImgFmt, string> = { png: "png", jpeg: "jpg", webp: "webp", avif: "avif", bmp: "bmp", gif: "gif", ico: "ico" };
export const LOSSY: readonly ImgFmt[] = ["jpeg", "webp", "avif"];
/** Formats that cannot keep transparency, so it is flattened onto the background colour. */
export const NEEDS_BG: readonly ImgFmt[] = ["jpeg", "bmp"];
/** Browsers refuse canvases larger than this many pixels (iOS Safari is the strictest). */
const MAX_PIXELS = 16_000_000;

export type Loaded = { src: CanvasImageSource; width: number; height: number; close: () => void };

let encoders: Promise<Record<ImgFmt, boolean>> | null = null;
/** Which output formats this browser can really produce (WebP and AVIF depend on the browser). */
export function supportedEncoders(): Promise<Record<ImgFmt, boolean>> {
  encoders ??= (async () => {
    const test = (mime: string) =>
      new Promise<boolean>((res) => {
        const c = document.createElement("canvas");
        c.width = c.height = 2;
        try { c.toBlob((b) => res(!!b && b.type === mime), mime); } catch { res(false); }
      });
    const [webp, avif] = await Promise.all([test("image/webp"), test("image/avif")]);
    return { png: true, jpeg: true, webp, avif, bmp: true, gif: true, ico: true };
  })();
  return encoders;
}

function svgSize(text: string): { w: number; h: number } {
  const tag = /<svg[^>]*>/i.exec(text)?.[0] ?? "";
  const num = (a: string) => {
    const r = new RegExp(`\\s${a}\\s*=\\s*["']([\\d.]+)(?:px)?["']`, "i").exec(tag);
    return r ? parseFloat(r[1]) : 0;
  };
  let w = num("width"), h = num("height");
  if (!w || !h) {
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(tag);
    if (vb) { w = parseFloat(vb[1]); h = parseFloat(vb[2]); }
  }
  if (!w || !h) { w = 1024; h = 1024; }
  const long = Math.max(w, h);
  if (long < 1024) { const k = 1024 / long; w *= k; h *= k; }
  return { w: Math.round(w), h: Math.round(h) };
}

/** Decodes any image the browser can read. EXIF rotation is applied, so phone photos come out upright. */
export async function loadImage(file: Blob, kind: Kind): Promise<Loaded> {
  if (kind !== "svg" && typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* fall back to <img> below */ }
  }
  const text = kind === "svg" ? await file.text() : "";
  const blob = kind === "svg"
    ? blobOf([enc.encode(/<svg[^>]*xmlns=/i.test(text) ? text : text.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"'))], "image/svg+xml")
    : file;
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error("decode"); }
  const s = kind === "svg" ? svgSize(text) : { w: img.naturalWidth, h: img.naturalHeight };
  return { src: img, width: s.w, height: s.h, close: () => URL.revokeObjectURL(url) };
}

/** Longest side limit (0 = keep size). Never enlarges, and never exceeds the browser's canvas limit. */
export function fitSize(w: number, h: number, maxSide: number): { w: number; h: number } {
  let k = 1;
  if (maxSide && Math.max(w, h) > maxSide) k = maxSide / Math.max(w, h);
  if (w * h * k * k > MAX_PIXELS) k = Math.sqrt(MAX_PIXELS / (w * h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

export function render(src: Loaded, w: number, h: number, bg: string | null): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.src, 0, 0, w, h);
  return c;
}

const toBlob = (c: HTMLCanvasElement, mime: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), mime, q));
const imgData = (c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height);

export async function encodeIco(c: HTMLCanvasElement, sizes: readonly number[]): Promise<Blob> {
  const pngs: { size: number; data: Uint8Array }[] = [];
  for (const s of sizes) {
    const t = document.createElement("canvas");
    t.width = t.height = s;
    const ctx = t.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const k = Math.min(s / c.width, s / c.height), dw = c.width * k, dh = c.height * k;
    ctx.drawImage(c, (s - dw) / 2, (s - dh) / 2, dw, dh);
    pngs.push({ size: s, data: await bytesOf(await toBlob(t, "image/png")) });
  }
  let offset = 6 + 16 * pngs.length;
  const dir: number[] = [];
  for (const p of pngs) {
    const s = p.size >= 256 ? 0 : p.size;
    dir.push(s, s, 0, 0, ...u16(1), ...u16(32), ...u32(p.data.length), ...u32(offset));
    offset += p.data.length;
  }
  return blobOf([new Uint8Array([...u16(0), ...u16(1), ...u16(pngs.length), ...dir]), ...pngs.map((p) => p.data)], "image/x-icon");
}

export async function encodeCanvas(c: HTMLCanvasElement, fmt: ImgFmt, quality: number, icoSizes: readonly number[] = [16, 32, 48, 256]): Promise<Blob> {
  switch (fmt) {
    case "png": return toBlob(c, "image/png");
    case "jpeg":
    case "webp":
    case "avif": {
      const b = await toBlob(c, FMT_MIME[fmt], quality);
      if (b.type !== FMT_MIME[fmt]) throw new Error("unsupported");
      return b;
    }
    case "bmp": return blobOf([encodeBmp(imgData(c))], "image/bmp");
    case "gif": return blobOf([encodeGif(imgData(c))], "image/gif");
    case "ico": return encodeIco(c, icoSizes);
  }
}

export type Encoded = { blob: Blob; quality: number; scale: number; w: number; h: number; met: boolean };

/**
 * "Make it at most N bytes": keeps the size and lowers quality first, then shrinks the picture
 * in small steps, so you get the best-looking file that still fits the limit.
 */
export async function encodeToTarget(src: Loaded, baseW: number, baseH: number, fmt: ImgFmt, target: number, bg: string | null): Promise<Encoded> {
  const lossy = LOSSY.includes(fmt);
  const scales = [1, 0.85, 0.72, 0.61, 0.52, 0.44, 0.37, 0.31, 0.26, 0.22, 0.18, 0.15];
  let last: Encoded | null = null;
  for (const s of scales) {
    const w = Math.max(1, Math.round(baseW * s)), h = Math.max(1, Math.round(baseH * s));
    const c = render(src, w, h, bg);
    if (!lossy) {
      const blob = await encodeCanvas(c, fmt, 1);
      last = { blob, quality: 1, scale: s, w, h, met: blob.size <= target };
      if (last.met) return last;
      continue;
    }
    const qMin = 0.4;
    const first = await encodeCanvas(c, fmt, qMin);
    last = { blob: first, quality: qMin, scale: s, w, h, met: first.size <= target };
    if (!last.met) continue;
    let lo = qMin, hi = 0.95, best = last;
    for (let i = 0; i < 6; i++) {
      const q = (lo + hi) / 2, b = await encodeCanvas(c, fmt, q);
      if (b.size <= target) { best = { blob: b, quality: q, scale: s, w, h, met: true }; lo = q; } else hi = q;
    }
    return best;
  }
  if (lossy && last) {
    const blob = await encodeCanvas(render(src, last.w, last.h, bg), fmt, 0.15);
    return { ...last, blob, quality: 0.15, met: blob.size <= target };
  }
  return last as Encoded;
}

/* ---------------- hidden data in the original file (the "privacy X-ray") ---------------- */
export type Meta = {
  camera?: string; software?: string; date?: string; artist?: string; copyright?: string; lens?: string;
  gps?: { lat: number; lon: number }; other: boolean;
};

const asciiAt = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, Math.min(to, b.length)));

function parseExif(b: Uint8Array, ts: number, end: number): Meta {
  const m: Meta = { other: false };
  const little = b[ts] === 0x49;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const r16 = (o: number) => v.getUint16(o, little), r32 = (o: number) => v.getUint32(o, little);
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const entries = (ifd: number) => {
    const out: { tag: number; type: number; count: number; at: number }[] = [];
    if (ifd <= 0 || ts + ifd + 2 > end) return out;
    const n = r16(ts + ifd);
    for (let i = 0; i < n; i++) {
      const e = ts + ifd + 2 + i * 12;
      if (e + 12 > end) break;
      const type = r16(e + 2), count = r32(e + 4), bytes = (sizes[type] ?? 1) * count;
      out.push({ tag: r16(e), type, count, at: bytes <= 4 ? e + 8 : ts + r32(e + 8) });
    }
    return out;
  };
  const str = (e: { count: number; at: number }) => asciiAt(b, e.at, e.at + e.count).replace(/\0+$/, "").trim();
  const rats = (e: { count: number; at: number }) => Array.from({ length: e.count }, (_, i) => r32(e.at + i * 8) / (r32(e.at + i * 8 + 4) || 1));
  let make = "", model = "", exifPtr = 0, gpsPtr = 0;
  for (const e of entries(r32(ts + 4))) {
    if (e.tag === 0x010f) make = str(e);
    else if (e.tag === 0x0110) model = str(e);
    else if (e.tag === 0x0131) m.software = str(e);
    else if (e.tag === 0x0132) m.date = str(e);
    else if (e.tag === 0x013b) m.artist = str(e);
    else if (e.tag === 0x8298) m.copyright = str(e);
    else if (e.tag === 0x8769) exifPtr = r32(e.at);
    else if (e.tag === 0x8825) gpsPtr = r32(e.at);
  }
  if (make || model) m.camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
  if (exifPtr) for (const e of entries(exifPtr)) {
    if (e.tag === 0x9003) m.date = str(e);
    else if (e.tag === 0xa434) m.lens = str(e);
  }
  if (gpsPtr) {
    let latRef = "N", lonRef = "E", lat: number[] = [], lon: number[] = [];
    for (const e of entries(gpsPtr)) {
      if (e.tag === 1) latRef = str(e); else if (e.tag === 3) lonRef = str(e);
      else if (e.tag === 2 && e.count === 3) lat = rats(e); else if (e.tag === 4 && e.count === 3) lon = rats(e);
    }
    if (lat.length === 3 && lon.length === 3) {
      const d = (a: number[]) => a[0] + a[1] / 60 + a[2] / 3600;
      m.gps = { lat: +(d(lat) * (latRef === "S" ? -1 : 1)).toFixed(5), lon: +(d(lon) * (lonRef === "W" ? -1 : 1)).toFixed(5) };
    }
  }
  return m;
}

/** Reads EXIF/XMP/text chunks from JPEG, PNG and WebP. Returns null when the file carries nothing. */
export async function readMetadata(file: Blob, kind: Kind): Promise<Meta | null> {
  if (kind !== "jpeg" && kind !== "png" && kind !== "webp") return null;
  const b = await bytesOf(file.size > 30_000_000 ? file.slice(0, 30_000_000) : file);
  let m: Meta = { other: false };
  if (kind === "jpeg") {
    let o = 2;
    while (o + 4 <= b.length && b[o] === 0xff) {
      const marker = b[o + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const len = (b[o + 2] << 8) | b[o + 3];
      if (marker === 0xe1) {
        if (asciiAt(b, o + 4, o + 10) === "Exif\0\0") { try { m = { ...parseExif(b, o + 10, o + 2 + len), other: m.other }; } catch { /* corrupt EXIF */ } }
        else if (asciiAt(b, o + 4, o + 32).includes("ns.adobe.com/xap")) m.other = true;
      } else if (marker === 0xed) m.other = true;
      o += 2 + len;
    }
  } else if (kind === "png") {
    let o = 8;
    while (o + 8 <= b.length) {
      const len = new DataView(b.buffer, b.byteOffset + o, 4).getUint32(0), name = asciiAt(b, o + 4, o + 8);
      if (name === "eXIf") { try { m = { ...parseExif(b, o + 8, o + 8 + len), other: m.other }; } catch { /* ignore */ } }
      else if (name === "tEXt" || name === "iTXt" || name === "zTXt") m.other = true;
      if (name === "IDAT") break;
      o += 12 + len;
    }
  } else {
    let o = 12;
    while (o + 8 <= b.length) {
      const name = asciiAt(b, o, o + 4), len = new DataView(b.buffer, b.byteOffset + o + 4, 4).getUint32(0, true);
      if (name === "EXIF") { try { m = { ...parseExif(b, o + 8 + (asciiAt(b, o + 8, o + 14) === "Exif\0\0" ? 6 : 0), o + 8 + len), other: m.other }; } catch { /* ignore */ } }
      else if (name === "XMP ") m.other = true;
      o += 8 + len + (len & 1);
    }
  }
  const any = m.camera || m.software || m.date || m.artist || m.copyright || m.lens || m.gps || m.other;
  return any ? m : null;
}

/* ---------------- favicon & app-icon pack ---------------- */
export async function faviconPack(src: Loaded, bg: string): Promise<ZipFile[]> {
  const base = render(src, src.width, src.height, null);
  const png = async (size: number, solid: boolean): Promise<Uint8Array> => {
    const t = document.createElement("canvas");
    t.width = t.height = size;
    const ctx = t.getContext("2d")!;
    if (solid) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    ctx.imageSmoothingQuality = "high";
    const pad = solid ? size * 0.1 : 0, k = Math.min((size - pad * 2) / base.width, (size - pad * 2) / base.height);
    ctx.drawImage(base, (size - base.width * k) / 2, (size - base.height * k) / 2, base.width * k, base.height * k);
    return bytesOf(await toBlob(t, "image/png"));
  };
  const manifest = JSON.stringify({ name: "App", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2);
  const snippet = [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    "",
  ].join("\n");
  return [
    { name: "favicon.ico", data: await bytesOf(await encodeIco(base, [16, 32, 48])) },
    { name: "favicon-16x16.png", data: await png(16, false) },
    { name: "favicon-32x32.png", data: await png(32, false) },
    { name: "apple-touch-icon.png", data: await png(180, true) },
    { name: "icon-192.png", data: await png(192, false) },
    { name: "icon-512.png", data: await png(512, false) },
    { name: "site.webmanifest", data: enc.encode(manifest) },
    { name: "favicon-snippet.html", data: enc.encode(snippet) },
  ];
}

/** Encodes a canvas as a JPEG page for the PDF writer. */
export async function jpegBytes(c: HTMLCanvasElement, q: number): Promise<Uint8Array> {
  return bytesOf(await toBlob(c, "image/jpeg", q));
}

