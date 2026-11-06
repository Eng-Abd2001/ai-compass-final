import { IMAGE_KINDS, type Kind } from "./sniff";
import type { ImgFmt } from "./image";

export type Group = "image" | "pdf" | "doc" | "data";
export type OptKey = "size" | "quality" | "bg" | "target" | "page" | "pages" | "dpi" | "marks" | "split" | "delim" | "bom" | "sheets" | "header" | "ico" | "organize" | "maxdpi";

export type Route = {
  id: string;
  group: Group;
  from: readonly Kind[];
  /** each = every file on its own, all = files combined into one output, one = exactly one file */
  mode: "each" | "all" | "one";
  min?: number;
  opts: readonly OptKey[];
  fmt?: ImgFmt;
  /** The converted file carries none of the original's hidden data (EXIF, author, software...). */
  cleans: boolean;
  engine: "none" | "pdf" | "print";
};

const IMG = IMAGE_KINDS;
const img = (fmt: ImgFmt, opts: readonly OptKey[]): Route => ({ id: `img-${fmt}`, group: "image", from: IMG, mode: "each", opts, fmt, cleans: true, engine: "none" });

export const ROUTES: readonly Route[] = [
  img("png", ["size", "target"]),
  img("jpeg", ["size", "quality", "bg", "target"]),
  img("webp", ["size", "quality", "target"]),
  img("avif", ["size", "quality", "target"]),
  img("bmp", ["size", "bg"]),
  img("gif", ["size", "target"]),
  img("ico", ["ico"]),
  { id: "img-pdf", group: "image", from: IMG, mode: "all", opts: ["page", "size", "quality", "target"], cleans: true, engine: "none" },
  { id: "img-favicon", group: "image", from: IMG, mode: "one", opts: ["bg"], cleans: true, engine: "none" },

  { id: "pdf-png", group: "pdf", from: ["pdf"], mode: "each", opts: ["pages", "dpi"], fmt: "png", cleans: true, engine: "pdf" },
  { id: "pdf-jpeg", group: "pdf", from: ["pdf"], mode: "each", opts: ["pages", "dpi", "quality"], fmt: "jpeg", cleans: true, engine: "pdf" },
  { id: "pdf-webp", group: "pdf", from: ["pdf"], mode: "each", opts: ["pages", "dpi", "quality"], fmt: "webp", cleans: true, engine: "pdf" },
  { id: "pdf-text", group: "pdf", from: ["pdf"], mode: "each", opts: ["marks"], cleans: false, engine: "pdf" },
  { id: "pdf-organize", group: "pdf", from: ["pdf"], mode: "one", opts: ["organize"], cleans: true, engine: "pdf" },
  { id: "pdf-split", group: "pdf", from: ["pdf"], mode: "one", opts: ["split"], cleans: true, engine: "pdf" },
  { id: "pdf-merge", group: "pdf", from: ["pdf", ...IMG], mode: "all", min: 2, opts: [], cleans: true, engine: "pdf" },
  { id: "pdf-compress", group: "pdf", from: ["pdf"], mode: "each", opts: ["target", "maxdpi"], cleans: true, engine: "pdf" },
  { id: "pdf-clean", group: "pdf", from: ["pdf"], mode: "each", opts: [], cleans: true, engine: "pdf" },

  { id: "docx-txt", group: "doc", from: ["docx"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "docx-md", group: "doc", from: ["docx"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "docx-html", group: "doc", from: ["docx"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "xlsx-csv", group: "doc", from: ["xlsx"], mode: "each", opts: ["delim", "bom", "sheets"], cleans: false, engine: "none" },
  { id: "xlsx-json", group: "doc", from: ["xlsx"], mode: "each", opts: ["header", "sheets"], cleans: false, engine: "none" },
  { id: "pptx-txt", group: "doc", from: ["pptx"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "pptx-md", group: "doc", from: ["pptx"], mode: "each", opts: [], cleans: false, engine: "none" },

  { id: "data-xlsx", group: "data", from: ["csv", "tsv", "json"], mode: "each", opts: ["delim"], cleans: false, engine: "none" },
  { id: "data-json", group: "data", from: ["csv", "tsv"], mode: "each", opts: ["header"], cleans: false, engine: "none" },
  { id: "data-csv", group: "data", from: ["csv", "tsv", "json"], mode: "each", opts: ["delim", "bom"], cleans: false, engine: "none" },
  { id: "md-html", group: "data", from: ["md"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "md-docx", group: "data", from: ["md"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "txt-docx", group: "data", from: ["txt"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "html-txt", group: "data", from: ["html"], mode: "each", opts: [], cleans: false, engine: "none" },
  { id: "print-pdf", group: "data", from: ["docx", "md", "txt", "html"], mode: "one", opts: [], cleans: false, engine: "print" },
];

export const GROUPS: readonly Group[] = ["image", "pdf", "doc", "data"];

/** Kinds that at least one route can read. */
export const SUPPORTED: ReadonlySet<Kind> = new Set(ROUTES.flatMap((r) => r.from));

/** Routes that fit the given set of (supported) file kinds. */
export function routesFor(kinds: readonly Kind[]): Route[] {
  if (!kinds.length) return [];
  const set = new Set(kinds);
  return ROUTES.filter((r) => [...set].every((k) => r.from.includes(k)) && kinds.length >= (r.min ?? 1) && (r.mode !== "one" || kinds.length === 1));
}

/** Proper names of formats (not translated). */
export const KIND_NAME: Partial<Record<Kind, string>> = {
  png: "PNG", jpeg: "JPG", webp: "WebP", gif: "GIF", bmp: "BMP", ico: "ICO", avif: "AVIF", heic: "HEIC", svg: "SVG",
  pdf: "PDF", docx: "Word", xlsx: "Excel", pptx: "PowerPoint", csv: "CSV", tsv: "TSV", json: "JSON", md: "Markdown", html: "HTML", txt: "TXT",
};

/** "PNG, JPG, ..." for image routes, "Word" for docx routes, etc. */
export const fromNames = (r: Route): string => (r.from.length === IMAGE_KINDS.length ? IMAGE_KINDS : r.from.filter((k) => !IMAGE_KINDS.includes(k))).map((k) => KIND_NAME[k] ?? k).join(", ") + (r.id === "pdf-merge" ? " + " + IMAGE_KINDS.map((k) => KIND_NAME[k]).join(", ") : "");
