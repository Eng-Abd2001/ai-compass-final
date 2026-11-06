/* PDF tools. pdf.js and pdf-lib are self-hosted in /public/vendor and loaded only when a PDF is opened. */
import { blobOf } from "./bytes";
import { buildPdf, type PageSpec, type PdfImagePage } from "./pdfwrite";
import { encodeCanvas, fitSize, jpegBytes, render, type ImgFmt, type Loaded } from "./image";

/* eslint-disable @typescript-eslint/no-explicit-any */
let pdfjsP: Promise<any> | null = null;
export function loadPdfjs(): Promise<any> {
  pdfjsP ??= (async () => {
    const url = "/vendor/pdfjs/pdf.min.mjs";
    const m = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
    m.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
    return m;
  })().catch((e) => { pdfjsP = null; throw e; });
  return pdfjsP;
}

let libP: Promise<any> | null = null;
export function loadPdfLib(): Promise<any> {
  libP ??= new Promise<any>((res, rej) => {
    const w = window as any;
    if (w.PDFLib) return res(w.PDFLib);
    const s = document.createElement("script");
    s.src = "/vendor/pdf-lib/pdf-lib.min.js";
    s.async = true;
    s.onload = () => (w.PDFLib ? res(w.PDFLib) : rej(new Error("lib")));
    s.onerror = () => { libP = null; rej(new Error("lib")); };
    document.head.appendChild(s);
  });
  return libP;
}

export type PdfMeta = { title?: string; author?: string; subject?: string; keywords?: string; creator?: string; producer?: string; created?: string; modified?: string; xmp: boolean };
export type PdfHandle = { doc: any; pages: number; meta: PdfMeta; bytes: Uint8Array; destroy: () => void };

const pdfDate = (s?: string): string | undefined => {
  const m = /D:(\d{4})(\d{2})?(\d{2})?/.exec(s || "");
  return m ? [m[1], m[2], m[3]].filter(Boolean).join("-") : s || undefined;
};

/** Opens a PDF for rendering. Throws Error("password") for protected files and Error("pdf") for damaged ones. */
export async function openPdf(bytes: Uint8Array): Promise<PdfHandle> {
  const lib = await loadPdfjs();
  const task = lib.getDocument({
    data: bytes.slice(),
    cMapUrl: "/vendor/pdfjs/cmaps/", cMapPacked: true,
    standardFontDataUrl: "/vendor/pdfjs/standard_fonts/", wasmUrl: "/vendor/pdfjs/wasm/", iccUrl: "/vendor/pdfjs/iccs/",
  });
  let doc: any;
  try { doc = await task.promise; } catch (e: any) {
    throw new Error(e?.name === "PasswordException" ? "password" : "pdf");
  }
  const md = await doc.getMetadata().catch(() => null);
  const i = md?.info ?? {};
  const meta: PdfMeta = {
    title: i.Title || undefined, author: i.Author || undefined, subject: i.Subject || undefined, keywords: i.Keywords || undefined,
    creator: i.Creator || undefined, producer: i.Producer || undefined, created: pdfDate(i.CreationDate), modified: pdfDate(i.ModDate),
    xmp: !!md?.metadata,
  };
  return { doc, pages: doc.numPages, meta, bytes, destroy: () => { try { doc.destroy(); } catch { /* ignore */ } } };
}

export const hasMeta = (m: PdfMeta): boolean => !!(m.title || m.author || m.subject || m.keywords || m.creator || m.producer || m.created || m.modified || m.xmp);

/** Draws one page (1-based) onto a canvas. `scale` 1 = 72 dpi. Capped so the canvas stays within browser limits. */
export async function renderPdfPage(h: PdfHandle, n: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await h.doc.getPage(n);
  let vp = page.getViewport({ scale });
  const k = Math.min(1, Math.sqrt(16_000_000 / (vp.width * vp.height)));
  if (k < 1) vp = page.getViewport({ scale: scale * k });
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(vp.width));
  c.height = Math.max(1, Math.ceil(vp.height));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, canvas: c, viewport: vp }).promise;
  page.cleanup();
  return c;
}

export async function pdfPageSize(h: PdfHandle, n: number): Promise<[number, number]> {
  const vp = (await h.doc.getPage(n)).getViewport({ scale: 1 });
  return [vp.width, vp.height];
}

/** "1-3, 5, 8-" -> [1,2,3,5,8,...]. Throws Error("range") on nonsense. */
export function parseRanges(text: string, max: number): number[] {
  const set = new Set<number>();
  for (const part of text.split(/[,،;\s]+/).filter(Boolean)) {
    const m = /^(\d*)-(\d*)$/.exec(part);
    if (m) {
      const a = m[1] ? parseInt(m[1], 10) : 1, b = m[2] ? parseInt(m[2], 10) : max;
      if (a < 1 || b < a || a > max) throw new Error("range");
      for (let i = a; i <= Math.min(b, max); i++) set.add(i);
    } else if (/^\d+$/.test(part)) {
      const v = parseInt(part, 10);
      if (v < 1 || v > max) throw new Error("range");
      set.add(v);
    } else throw new Error("range");
  }
  if (!set.size) throw new Error("range");
  return [...set].sort((a, b) => a - b);
}

export async function pdfToImages(h: PdfHandle, pages: number[], fmt: ImgFmt, dpi: number, quality: number, onPage?: (done: number) => void): Promise<{ page: number; blob: Blob }[]> {
  const out: { page: number; blob: Blob }[] = [];
  for (const n of pages) {
    const c = await renderPdfPage(h, n, dpi / 72);
    out.push({ page: n, blob: await encodeCanvas(c, fmt, quality) });
    onPage?.(out.length);
  }
  return out;
}

export async function pdfText(h: PdfHandle, onPage?: (done: number) => void): Promise<string[]> {
  const out: string[] = [];
  for (let n = 1; n <= h.pages; n++) {
    const tc = await (await h.doc.getPage(n)).getTextContent();
    let s = "", lastY: number | null = null;
    for (const it of tc.items as any[]) {
      if (typeof it.str !== "string") continue;
      const y = it.transform?.[5] as number | undefined;
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2 && !s.endsWith("\n")) s += "\n";
      s += it.str;
      if (it.hasEOL && !s.endsWith("\n")) s += "\n";
      if (y !== undefined) lastY = y;
    }
    out.push(s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
    onPage?.(n);
  }
  return out;
}

/* ---------------- pdf-lib: pages, merge, clean ---------------- */
export type PagePlan = { page: number; rotate: number }; // page is 0-based, rotate in degrees (multiple of 90)

export async function assemblePdf(bytes: Uint8Array, plan: PagePlan[]): Promise<Uint8Array> {
  const L = await loadPdfLib();
  const src = await L.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const out = await L.PDFDocument.create({ updateMetadata: false });
  const copied = await out.copyPages(src, plan.map((p) => p.page));
  copied.forEach((pg: any, i: number) => {
    const r = plan[i].rotate;
    if (r) pg.setRotation(L.degrees((pg.getRotation().angle + r + 360) % 360));
    out.addPage(pg);
  });
  return out.save();
}

export type MergePart = { type: "pdf"; bytes: Uint8Array } | { type: "image"; jpeg: Uint8Array; w: number; h: number };
const A4: [number, number] = [595.28, 841.89];

export async function mergeParts(parts: MergePart[]): Promise<Uint8Array> {
  const L = await loadPdfLib();
  const out = await L.PDFDocument.create({ updateMetadata: false });
  for (const p of parts) {
    if (p.type === "pdf") {
      const src = await L.PDFDocument.load(p.bytes, { ignoreEncryption: true, updateMetadata: false });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((pg: any) => out.addPage(pg));
    } else {
      const img = await out.embedJpg(p.jpeg);
      let [W, H] = A4;
      if (p.w > p.h) [W, H] = [H, W];
      const k = Math.min((W - 40) / p.w, (H - 40) / p.h), dw = p.w * k, dh = p.h * k;
      out.addPage([W, H]).drawImage(img, { x: (W - dw) / 2, y: (H - dh) / 2, width: dw, height: dh });
    }
  }
  return out.save();
}

/** Removes the Info dictionary and the XMP packet (author, software, dates, titles). */
export async function scrubPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const L = await loadPdfLib();
  const d = await L.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  d.catalog.delete(L.PDFName.of("Metadata"));
  d.context.trailerInfo.Info = d.context.register(d.context.obj({}));
  return d.save();
}

/* ---------------- images -> PDF, and "make this PDF smaller" ---------------- */
export type ImagePdfOpts = { spec: PageSpec; maxSide: number; quality: number };

export async function imagesToPdf(items: Loaded[], o: ImagePdfOpts): Promise<Uint8Array> {
  const pages: PdfImagePage[] = [];
  for (const it of items) {
    const { w, h } = fitSize(it.width, it.height, o.maxSide);
    pages.push({ jpeg: await jpegBytes(render(it, w, h, "#ffffff"), o.quality), w, h });
  }
  return buildPdf(pages, o.spec);
}

/** Tries smaller image sets until the PDF is at most `target` bytes. Returns the best attempt. */
export async function imagesToPdfTarget(items: Loaded[], spec: PageSpec, target: number, onTry?: () => void): Promise<{ bytes: Uint8Array; met: boolean }> {
  let last: Uint8Array = new Uint8Array();
  for (const maxSide of [0, 2600, 2000, 1500, 1100, 800]) {
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      onTry?.();
      last = await imagesToPdf(items, { spec, maxSide, quality });
      if (last.length <= target) return { bytes: last, met: true };
    }
  }
  return { bytes: last, met: false };
}

/**
 * Shrinks a PDF by drawing every page as a JPEG at a lower resolution. Text stops being selectable,
 * so this is meant for scans and forms that must fit an upload limit.
 */
export async function compressPdf(h: PdfHandle, target: number, maxDpi: number, onStep?: (page: number, total: number) => void): Promise<{ bytes: Uint8Array; dpi: number; quality: number; met: boolean }> {
  const tries: [number, number][] = [[150, 0.7], [150, 0.5], [110, 0.5], [96, 0.45], [72, 0.4], [60, 0.35], [48, 0.3]];
  const seen = new Set<string>();
  let result: { bytes: Uint8Array; dpi: number; quality: number; met: boolean } | null = null;
  for (const [d, quality] of tries) {
    const dpi = Math.min(d, maxDpi), key = `${dpi}/${quality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pages: PdfImagePage[] = [];
    let total = 0, over = false;
    for (let n = 1; n <= h.pages; n++) {
      onStep?.(n, h.pages);
      const [pw, ph] = await pdfPageSize(h, n);
      const c = await renderPdfPage(h, n, dpi / 72);
      const jpeg = await jpegBytes(c, quality);
      total += jpeg.length;
      pages.push({ jpeg, w: c.width, h: c.height, pt: [pw, ph] });
      if (total > target * 1.02 && n < h.pages) { over = true; break; }
    }
    if (over) { result = { bytes: new Uint8Array(), dpi, quality, met: false }; continue; }
    const bytes = buildPdf(pages, { size: "fit", orient: "auto", margin: 0 });
    result = { bytes, dpi, quality, met: bytes.length <= target };
    if (result.met) return result;
  }
  // nothing fit: rebuild the smallest setting completely so the user still gets a file
  const [d, quality] = tries[tries.length - 1];
  const dpi = Math.min(d, maxDpi), pages: PdfImagePage[] = [];
  for (let n = 1; n <= h.pages; n++) {
    onStep?.(n, h.pages);
    const [pw, ph] = await pdfPageSize(h, n);
    const c = await renderPdfPage(h, n, dpi / 72);
    pages.push({ jpeg: await jpegBytes(c, quality), w: c.width, h: c.height, pt: [pw, ph] });
  }
  const bytes = buildPdf(pages, { size: "fit", orient: "auto", margin: 0 });
  return { bytes, dpi, quality, met: bytes.length <= target };
}

export const pdfBlob = (b: Uint8Array): Blob => blobOf([b], "application/pdf");
