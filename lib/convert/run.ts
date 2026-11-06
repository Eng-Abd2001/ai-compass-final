import { baseName, blobOf, bytesOf, enc, hasArabic } from "./bytes";
import {
  FMT_EXT, NEEDS_BG, encodeCanvas, encodeToTarget, faviconPack, fitSize, jpegBytes, loadImage, render, type ImgFmt, type Loaded,
} from "./image";
import {
  blocksToHtml, blocksToMd, blocksToText, htmlToText, jsonToRows, mdToHtmlBody, parseCsv, readDocx, readPptx, readXlsx, rowsToJson, rowsToXlsx,
  sanitizeHtml, slidesToMd, slidesToText, textToDocx, toCsv, mdToHtml, type Rows,
} from "./office";
import {
  assemblePdf, compressPdf, imagesToPdf, imagesToPdfTarget, mergeParts, parseRanges, pdfBlob, pdfText, pdfToImages, scrubPdf, type MergePart, type PagePlan, type PdfHandle,
} from "./pdf";
import type { PageSize, Orient } from "./pdfwrite";
import type { Route } from "./routes";
import type { Kind } from "./sniff";
import { zipBlob, type ZipFile } from "./zip";

export type RunItem = { id: string; file: File; kind: Kind };
export type Out = { name: string; blob: Blob; note?: string; from?: number; image?: boolean };
export type Failure = { name: string; code: string };
export type RunResult = { outs: Out[]; failed: Failure[]; print?: { html: string; rtl: boolean } };

export type Opts = {
  maxSide: number; quality: number; bg: string; target: boolean; targetKb: number;
  page: PageSize; orient: Orient; margin: number;
  pages: string; dpi: number; maxdpi: number; marks: boolean;
  split: "each" | "every" | "ranges"; every: number; ranges: string;
  delim: string; bom: boolean; allSheets: boolean; header: boolean; ico: number[];
  plan: PagePlan[];
};

export const DEFAULT_OPTS: Opts = {
  maxSide: 0, quality: 82, bg: "#ffffff", target: false, targetKb: 200,
  page: "a4", orient: "auto", margin: 10,
  pages: "", dpi: 150, maxdpi: 150, marks: true,
  split: "each", every: 2, ranges: "",
  delim: ",", bom: true, allSheets: true, header: true, ico: [16, 32, 48, 256],
  plan: [],
};

export type RunCtx = {
  opts: Opts;
  progress: (done: number, total: number) => void;
  cancelled: () => boolean;
  getPdf: (item: RunItem) => Promise<PdfHandle>;
  encoders: Record<ImgFmt, boolean>;
};

const MM = 72 / 25.4;
const text = (s: string, mime = "text/plain") => blobOf([enc.encode(s)], `${mime};charset=utf-8`);

/** Gives every output a unique name (a.png, a-2.png, ...). */
function uniq(outs: Out[]): Out[] {
  const seen = new Map<string, number>();
  return outs.map((o) => {
    const n = seen.get(o.name) ?? 0;
    seen.set(o.name, n + 1);
    if (!n) return o;
    const dot = o.name.lastIndexOf(".");
    return { ...o, name: `${o.name.slice(0, dot)}-${n + 1}${o.name.slice(dot)}` };
  });
}

const code = (e: unknown): string => (e instanceof Error ? e.message : "generic");
const KNOWN = new Set(["decode", "heic", "password", "pdf", "range", "unsupported", "lib", "xml", "docx", "xlsx", "bad-zip", "not-a-zip", "zip-method", "encode"]);
const norm = (c: string): string => (KNOWN.has(c) ? c : "generic");

async function zipOf(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const z: ZipFile[] = [];
  for (const f of files) z.push({ name: f.name, data: await bytesOf(f.blob) });
  return zipBlob(z);
}

export async function runRoute(route: Route, items: RunItem[], ctx: RunCtx): Promise<RunResult> {
  const outs: Out[] = [];
  const failed: Failure[] = [];
  const o = ctx.opts;
  const total = items.length;
  const fail = (it: RunItem, e: unknown) => {
    let c = norm(code(e));
    if (c === "decode" && it.kind === "heic") c = "heic";
    failed.push({ name: it.file.name, code: c });
  };

  /* ---------- images -> image formats ---------- */
  if (route.id.startsWith("img-") && route.fmt) {
    const fmt = route.fmt;
    if (!ctx.encoders[fmt]) throw new Error("unsupported");
    for (let i = 0; i < total; i++) {
      if (ctx.cancelled()) break;
      ctx.progress(i, total);
      const it = items[i];
      let L: Loaded | null = null;
      try {
        L = await loadImage(it.file, it.kind);
        const { w, h } = fitSize(L.width, L.height, o.maxSide);
        const bg = NEEDS_BG.includes(fmt) ? o.bg : null;
        let blob: Blob, note: string | undefined;
        if (o.target && fmt !== "ico" && route.opts.includes("target")) {
          const r = await encodeToTarget(L, w, h, fmt, o.targetKb * 1024, bg);
          blob = r.blob;
          note = `${r.met ? "ok" : "miss"}|${Math.round(r.quality * 100)}|${Math.round(r.scale * 100)}`;
        } else {
          blob = await encodeCanvas(render(L, w, h, bg), fmt, o.quality / 100, o.ico);
        }
        outs.push({ name: `${baseName(it.file.name)}.${FMT_EXT[fmt]}`, blob, note, from: it.file.size, image: fmt !== "ico" });
      } catch (e) { fail(it, e); } finally { L?.close(); }
    }
    ctx.progress(total, total);
    return { outs: uniq(outs), failed };
  }

  switch (route.id) {
    /* ---------- images -> one PDF ---------- */
    case "img-pdf": {
      const loaded: Loaded[] = [];
      try {
        for (let i = 0; i < total; i++) {
          if (ctx.cancelled()) break;
          ctx.progress(i, total);
          try { loaded.push(await loadImage(items[i].file, items[i].kind)); } catch (e) { fail(items[i], e); }
        }
        if (!loaded.length) return { outs, failed };
        const spec = { size: o.page, orient: o.orient, margin: o.margin * MM };
        let bytes: Uint8Array, note: string | undefined;
        if (o.target) {
          const r = await imagesToPdfTarget(loaded, spec, o.targetKb * 1024);
          bytes = r.bytes;
          note = r.met ? "ok" : "miss";
        } else bytes = await imagesToPdf(loaded, { spec, maxSide: o.maxSide, quality: o.quality / 100 });
        outs.push({ name: "images.pdf", blob: pdfBlob(bytes), note, from: items.reduce((s, x) => s + x.file.size, 0) });
      } finally { loaded.forEach((l) => l.close()); }
      ctx.progress(total, total);
      return { outs, failed };
    }

    case "img-favicon": {
      const it = items[0];
      let L: Loaded | null = null;
      try {
        L = await loadImage(it.file, it.kind);
        const files = await faviconPack(L, o.bg);
        outs.push({ name: "favicon-pack.zip", blob: zipBlob(files) });
      } catch (e) { fail(it, e); } finally { L?.close(); }
      return { outs, failed };
    }

    /* ---------- PDF -> images ---------- */
    case "pdf-png":
    case "pdf-jpeg":
    case "pdf-webp": {
      const fmt = route.fmt as ImgFmt;
      if (!ctx.encoders[fmt]) throw new Error("unsupported");
      for (const it of items) {
        if (ctx.cancelled()) break;
        try {
          const h = await ctx.getPdf(it);
          const pages = o.pages.trim() ? parseRanges(o.pages, h.pages) : Array.from({ length: h.pages }, (_, i) => i + 1);
          const imgs = await pdfToImages(h, pages, fmt, o.dpi, o.quality / 100, (d) => ctx.progress(d, pages.length));
          const base = baseName(it.file.name), pad = String(h.pages).length;
          const named = imgs.map((x) => ({ name: `${base}-${String(x.page).padStart(pad, "0")}.${FMT_EXT[fmt]}`, blob: x.blob }));
          if (named.length === 1) outs.push({ ...named[0], image: true, from: it.file.size });
          else outs.push({ name: `${base}-${FMT_EXT[fmt]}.zip`, blob: await zipOf(named), note: `pages|${named.length}`, from: it.file.size });
        } catch (e) { fail(it, e); }
      }
      return { outs: uniq(outs), failed };
    }

    case "pdf-text": {
      for (const it of items) {
        if (ctx.cancelled()) break;
        try {
          const h = await ctx.getPdf(it);
          const pages = await pdfText(h, (d) => ctx.progress(d, h.pages));
          const body = pages.map((t, i) => (o.marks ? `--- ${i + 1} ---\n${t}` : t)).join("\n\n") + "\n";
          outs.push({ name: `${baseName(it.file.name)}.txt`, blob: text(body), note: pages.every((t) => !t) ? "empty" : undefined, from: it.file.size });
        } catch (e) { fail(it, e); }
      }
      return { outs: uniq(outs), failed };
    }

    case "pdf-organize": {
      const it = items[0];
      try {
        const h = await ctx.getPdf(it);
        const plan = o.plan.length ? o.plan : Array.from({ length: h.pages }, (_, i) => ({ page: i, rotate: 0 }));
        if (!plan.length) throw new Error("range");
        outs.push({ name: `${baseName(it.file.name)}-edited.pdf`, blob: pdfBlob(await assemblePdf(h.bytes, plan)), from: it.file.size });
      } catch (e) { fail(it, e); }
      return { outs, failed };
    }

    case "pdf-split": {
      const it = items[0];
      try {
        const h = await ctx.getPdf(it);
        const all = Array.from({ length: h.pages }, (_, i) => i + 1);
        let groups: number[][];
        if (o.split === "each") groups = all.map((p) => [p]);
        else if (o.split === "every") {
          const n = Math.max(1, Math.floor(o.every));
          groups = [];
          for (let i = 0; i < all.length; i += n) groups.push(all.slice(i, i + n));
        } else {
          groups = o.ranges.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => parseRanges(s, h.pages));
          if (!groups.length) throw new Error("range");
        }
        const parts: { name: string; blob: Blob }[] = [];
        const base = baseName(it.file.name);
        for (let i = 0; i < groups.length; i++) {
          if (ctx.cancelled()) break;
          ctx.progress(i, groups.length);
          parts.push({ name: `${base}-part-${i + 1}.pdf`, blob: pdfBlob(await assemblePdf(h.bytes, groups[i].map((p) => ({ page: p - 1, rotate: 0 })))) });
        }
        if (parts.length === 1) outs.push({ ...parts[0], from: it.file.size });
        else outs.push({ name: `${base}-parts.zip`, blob: await zipOf(parts), note: `pages|${parts.length}`, from: it.file.size });
      } catch (e) { fail(it, e); }
      return { outs, failed };
    }

    case "pdf-merge": {
      const parts: MergePart[] = [];
      for (let i = 0; i < total; i++) {
        if (ctx.cancelled()) break;
        ctx.progress(i, total);
        const it = items[i];
        let L: Loaded | null = null;
        try {
          if (it.kind === "pdf") parts.push({ type: "pdf", bytes: await bytesOf(it.file) });
          else {
            L = await loadImage(it.file, it.kind);
            const { w, h } = fitSize(L.width, L.height, 2600);
            parts.push({ type: "image", jpeg: await jpegBytes(render(L, w, h, "#ffffff"), 0.88), w, h });
          }
        } catch (e) { fail(it, e); } finally { L?.close(); }
      }
      if (parts.length) outs.push({ name: "merged.pdf", blob: pdfBlob(await mergeParts(parts)), from: items.reduce((s, x) => s + x.file.size, 0) });
      ctx.progress(total, total);
      return { outs, failed };
    }

    case "pdf-compress": {
      for (const it of items) {
        if (ctx.cancelled()) break;
        try {
          const h = await ctx.getPdf(it);
          const r = await compressPdf(h, o.targetKb * 1024, o.maxdpi, (d, t) => ctx.progress(d, t));
          outs.push({ name: `${baseName(it.file.name)}-small.pdf`, blob: pdfBlob(r.bytes), note: `${r.met ? "ok" : "miss"}|${r.dpi}|${Math.round(r.quality * 100)}`, from: it.file.size });
        } catch (e) { fail(it, e); }
      }
      return { outs: uniq(outs), failed };
    }

    case "pdf-clean": {
      for (const it of items) {
        if (ctx.cancelled()) break;
        try {
          outs.push({ name: `${baseName(it.file.name)}-clean.pdf`, blob: pdfBlob(await scrubPdf(await bytesOf(it.file))), from: it.file.size });
        } catch (e) { fail(it, e); }
      }
      return { outs: uniq(outs), failed };
    }

    default: break;
  }

  /* ---------- documents and data ---------- */
  for (let i = 0; i < total; i++) {
    if (ctx.cancelled()) break;
    ctx.progress(i, total);
    const it = items[i];
    const base = baseName(it.file.name);
    try {
      switch (route.id) {
        case "docx-txt": outs.push({ name: `${base}.txt`, blob: text(blocksToText(await readDocx(await bytesOf(it.file)))) }); break;
        case "docx-md": outs.push({ name: `${base}.md`, blob: text(blocksToMd(await readDocx(await bytesOf(it.file))), "text/markdown") }); break;
        case "docx-html": outs.push({ name: `${base}.html`, blob: text(blocksToHtml(await readDocx(await bytesOf(it.file)), base), "text/html") }); break;
        case "pptx-txt": outs.push({ name: `${base}.txt`, blob: text(slidesToText(await readPptx(await bytesOf(it.file)))) }); break;
        case "pptx-md": outs.push({ name: `${base}.md`, blob: text(slidesToMd(await readPptx(await bytesOf(it.file))), "text/markdown") }); break;
        case "xlsx-csv":
        case "xlsx-json": {
          const sheets = await readXlsx(await bytesOf(it.file));
          if (!sheets.length) throw new Error("xlsx");
          const use = o.allSheets ? sheets : sheets.slice(0, 1);
          const csv = route.id === "xlsx-csv";
          const files = use.map((s) => ({
            name: `${use.length > 1 ? `${base}-${baseName(s.name)}` : base}.${csv ? "csv" : "json"}`,
            blob: csv ? text(toCsv(s.rows, o.delim, o.bom), "text/csv") : text(rowsToJson(s.rows, o.header, true), "application/json"),
          }));
          if (files.length === 1) outs.push(files[0]);
          else outs.push({ name: `${base}-${csv ? "csv" : "json"}.zip`, blob: await zipOf(files), note: `pages|${files.length}` });
          break;
        }
        case "data-xlsx":
        case "data-json":
        case "data-csv": {
          const src = await it.file.text();
          let rows: Rows;
          if (it.kind === "json") rows = jsonToRows(src);
          else rows = parseCsv(src, it.kind === "tsv" ? "\t" : undefined).rows;
          if (route.id === "data-xlsx") outs.push({ name: `${base}.xlsx`, blob: blobOf([rowsToXlsx(rows, base)], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") });
          else if (route.id === "data-json") outs.push({ name: `${base}.json`, blob: text(rowsToJson(rows, o.header, true), "application/json") });
          else outs.push({ name: `${base}.${o.delim === "\t" ? "tsv" : "csv"}`, blob: text(toCsv(rows, o.delim, o.bom), "text/csv") });
          break;
        }
        case "md-html": { const s = await it.file.text(); outs.push({ name: `${base}.html`, blob: text(mdToHtml(s, base), "text/html") }); break; }
        case "md-docx": outs.push({ name: `${base}.docx`, blob: blobOf([textToDocx(await it.file.text(), true)], "application/vnd.openxmlformats-officedocument.wordprocessingml.document") }); break;
        case "txt-docx": outs.push({ name: `${base}.docx`, blob: blobOf([textToDocx(await it.file.text(), false)], "application/vnd.openxmlformats-officedocument.wordprocessingml.document") }); break;
        case "html-txt": outs.push({ name: `${base}.txt`, blob: text(htmlToText(await it.file.text())) }); break;
        case "print-pdf": {
          let html: string, rtl = false;
          if (it.kind === "docx") {
            const blocks = await readDocx(await bytesOf(it.file));
            const full = blocksToHtml(blocks, base);
            rtl = /dir="rtl"/.test(full.slice(0, 120));
            html = sanitizeHtml(full).body;
          } else if (it.kind === "md") { const s = await it.file.text(); rtl = hasArabic(s); html = mdToHtmlBody(s); }
          else if (it.kind === "html") { const s = await it.file.text(); rtl = hasArabic(s); html = sanitizeHtml(s).body; }
          else {
            const s = await it.file.text();
            rtl = hasArabic(s);
            html = `<div style="white-space:pre-wrap">${s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
          }
          return { outs, failed, print: { html, rtl } };
        }
        default: throw new Error("unsupported");
      }
      if (outs.length) outs[outs.length - 1].from = it.file.size;
    } catch (e) { fail(it, e); }
  }
  ctx.progress(total, total);
  return { outs: uniq(outs), failed };
}

