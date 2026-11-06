import { dec } from "./bytes";
import { zipOpen } from "./zip";

export type Kind =
  | "png" | "jpeg" | "webp" | "gif" | "bmp" | "ico" | "avif" | "heic" | "svg"
  | "pdf" | "docx" | "xlsx" | "pptx" | "zip"
  | "csv" | "tsv" | "json" | "md" | "html" | "txt" | "unknown";

export const IMAGE_KINDS: readonly Kind[] = ["png", "jpeg", "webp", "gif", "bmp", "ico", "avif", "heic", "svg"];
export const isImage = (k: Kind): boolean => IMAGE_KINDS.includes(k);
export const isTextual = (k: Kind): boolean => ["csv", "tsv", "json", "md", "html", "txt"].includes(k);

const ascii = (b: Uint8Array, from: number, to: number): string => String.fromCharCode(...b.subarray(from, to));

/** Finds the real type from the first bytes of the file, not from its name. */
export async function sniff(file: File): Promise<Kind> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (head.length >= 8 && head[0] === 0x89 && ascii(head, 1, 4) === "PNG") return "png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  if (ascii(head, 0, 4) === "GIF8") return "gif";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return "webp";
  if (head[0] === 0x42 && head[1] === 0x4d && ext !== "txt") return "bmp";
  if (head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0) return "ico";
  if (ascii(head, 0, Math.min(head.length, 1024)).includes("%PDF-")) return "pdf";
  if (ascii(head, 4, 8) === "ftyp") {
    const brands = ascii(head, 8, Math.min(head.length, 64));
    return /avif|avis/.test(brands) ? "avif" : "heic";
  }
  if (head[0] === 0x50 && head[1] === 0x4b) {
    try {
      const z = zipOpen(new Uint8Array(await file.arrayBuffer()));
      if (z.names.includes("word/document.xml")) return "docx";
      if (z.names.includes("xl/workbook.xml")) return "xlsx";
      if (z.names.includes("ppt/presentation.xml")) return "pptx";
    } catch { /* fall through */ }
    return "zip";
  }
  if (head.includes(0)) return "unknown";
  const text = dec.decode(head).replace(/^\uFEFF/, "");
  const trimmed = text.trimStart();
  if (/<svg[\s>]/i.test(text)) return "svg";
  if (/^<!doctype html|^<html[\s>]/i.test(trimmed) || ext === "html" || ext === "htm") return "html";
  if (ext === "json" || ((trimmed.startsWith("{") || trimmed.startsWith("[")) && file.size < 20_000_000 && looksJson(await file.text()))) return "json";
  if (ext === "csv") return "csv";
  if (ext === "tsv" || ext === "tab") return "tsv";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt" || ext === "log" || ext === "text") return "txt";
  const first = text.split(/\r?\n/, 1)[0] || "";
  if (first.includes("\t") && text.split(/\r?\n/).length > 1) return "tsv";
  if ((first.match(/,/g) || []).length >= 1 && text.split(/\r?\n/).length > 1 && !first.includes(" ")) return "csv";
  return "txt";
}

function looksJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}
