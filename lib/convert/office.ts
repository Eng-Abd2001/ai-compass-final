import { enc, hasArabic } from "./bytes";
import { zipOpen, zipStore, type ZipFile } from "./zip";

const WNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ANS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const xml = (s: string): Document => {
  const d = new DOMParser().parseFromString(s, "application/xml");
  if (d.getElementsByTagName("parsererror").length) throw new Error("xml");
  return d;
};
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// XML 1.0 cannot hold most control characters.
const clean = (s: string): string => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");

/* =============================== DOCX =============================== */
export type Run = { t: string; b?: boolean; i?: boolean };
export type Block =
  | { kind: "p"; runs: Run[]; rtl?: boolean }
  | { kind: "h"; level: number; runs: Run[]; rtl?: boolean }
  | { kind: "li"; runs: Run[]; rtl?: boolean }
  | { kind: "table"; rows: string[][] };

const flag = (el: Element | null | undefined, name: string): boolean => {
  const e = el?.getElementsByTagNameNS(WNS, name)[0];
  if (!e) return false;
  const v = e.getAttributeNS(WNS, "val");
  return v !== "0" && v !== "false";
};

function paragraph(p: Element): Block {
  const pPr = Array.from(p.children).find((c) => c.localName === "pPr") ?? null;
  const style = pPr?.getElementsByTagNameNS(WNS, "pStyle")[0]?.getAttributeNS(WNS, "val") ?? "";
  const runs: Run[] = [];
  for (const r of Array.from(p.getElementsByTagNameNS(WNS, "r"))) {
    const rPr = Array.from(r.children).find((c) => c.localName === "rPr") ?? null;
    let t = "";
    for (const c of Array.from(r.children)) {
      if (c.localName === "t") t += c.textContent ?? "";
      else if (c.localName === "tab") t += "\t";
      else if (c.localName === "br" || c.localName === "cr") t += "\n";
    }
    if (t) runs.push({ t, b: flag(rPr, "b"), i: flag(rPr, "i") });
  }
  const rtl = flag(pPr, "bidi");
  const h = /^heading\s*(\d)$/i.exec(style);
  if (h) return { kind: "h", level: Math.min(6, +h[1]), runs, rtl };
  if (/^title$/i.test(style)) return { kind: "h", level: 1, runs, rtl };
  if (/^subtitle$/i.test(style)) return { kind: "h", level: 2, runs, rtl };
  if (pPr?.getElementsByTagNameNS(WNS, "numPr").length || /^list/i.test(style)) return { kind: "li", runs, rtl };
  return { kind: "p", runs, rtl };
}

export async function readDocx(buf: Uint8Array): Promise<Block[]> {
  const z = zipOpen(buf);
  const doc = await z.text("word/document.xml");
  if (!doc) throw new Error("docx");
  const body = xml(doc).getElementsByTagNameNS(WNS, "body")[0];
  const out: Block[] = [];
  const walk = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      if (el.localName === "p") out.push(paragraph(el));
      else if (el.localName === "tbl") {
        const rows = Array.from(el.children).filter((c) => c.localName === "tr").map((tr) =>
          Array.from(tr.children).filter((c) => c.localName === "tc").map((tc) =>
            Array.from(tc.getElementsByTagNameNS(WNS, "p")).map((p) => (paragraph(p) as { runs: Run[] }).runs.map((r) => r.t).join("")).join(" ").trim()));
        out.push({ kind: "table", rows });
      } else if (el.localName === "sdt" || el.localName === "sdtContent") walk(el);
    }
  };
  walk(body);
  return out;
}

const plain = (runs: Run[]): string => runs.map((r) => r.t).join("");

export function blocksToText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "table") out.push(b.rows.map((r) => r.join("\t")).join("\n"));
    else if (b.kind === "li") out.push("- " + plain(b.runs));
    else out.push(plain(b.runs));
  }
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const mdRuns = (runs: Run[]): string =>
  runs.map((r) => {
    const t = r.t.replace(/([*_`])/g, "\\$1");
    if (!t.trim()) return t;
    return r.b && r.i ? `***${t}***` : r.b ? `**${t}**` : r.i ? `*${t}*` : t;
  }).join("");

export function blocksToMd(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "h") out.push("#".repeat(b.level) + " " + plain(b.runs));
    else if (b.kind === "li") out.push("- " + mdRuns(b.runs));
    else if (b.kind === "table" && b.rows.length) {
      const w = Math.max(...b.rows.map((r) => r.length));
      const row = (r: string[]) => "| " + Array.from({ length: w }, (_, i) => (r[i] ?? "").replace(/\|/g, "\\|")).join(" | ") + " |";
      out.push([row(b.rows[0]), "| " + Array(w).fill("---").join(" | ") + " |", ...b.rows.slice(1).map(row)].join("\n"));
    } else if (b.kind === "p") out.push(mdRuns(b.runs));
  }
  // consecutive list items stay together
  return out.join("\n\n").replace(/(\n- [^\n]*)\n\n(?=- )/g, "$1\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const htmlRuns = (runs: Run[]): string =>
  runs.map((r) => {
    let t = esc(r.t).replace(/\n/g, "<br>");
    if (r.i) t = `<em>${t}</em>`;
    if (r.b) t = `<strong>${t}</strong>`;
    return t;
  }).join("");

export function blocksToHtml(blocks: Block[], title = "Document"): string {
  const texts = blocks.filter((b) => b.kind !== "table") as { runs: Run[]; rtl?: boolean }[];
  const rtl = texts.length > 0 && texts.filter((b) => b.rtl || hasArabic(plain(b.runs))).length * 2 > texts.length;
  const body: string[] = [];
  let list = false;
  const close = () => { if (list) { body.push("</ul>"); list = false; } };
  for (const b of blocks) {
    if (b.kind === "li") { if (!list) { body.push("<ul>"); list = true; } body.push(`<li dir="auto">${htmlRuns(b.runs)}</li>`); continue; }
    close();
    if (b.kind === "h") body.push(`<h${b.level} dir="auto">${htmlRuns(b.runs)}</h${b.level}>`);
    else if (b.kind === "table") body.push("<table>" + b.rows.map((r, i) => "<tr>" + r.map((c) => `<${i ? "td" : "th"}>${esc(c)}</${i ? "td" : "th"}>`).join("") + "</tr>").join("") + "</table>");
    else if (plain(b.runs).trim()) body.push(`<p dir="auto">${htmlRuns(b.runs)}</p>`);
  }
  close();
  return `<!doctype html>\n<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">\n<head>\n<meta charset="utf-8">\n<title>${esc(title)}</title>\n<style>body{font:16px/1.7 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 8px}</style>\n</head>\n<body>\n${body.join("\n")}\n</body>\n</html>\n`;
}

/** Plain text or light Markdown -> .docx (headings, bullets, bold, italic; Arabic paragraphs become right-to-left). */
export function textToDocx(text: string, markdown: boolean): Uint8Array {
  const inline = (s: string): Run[] => {
    if (!markdown) return [{ t: s }];
    const runs: Run[] = [];
    const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|__[^_]+__)/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > last) runs.push({ t: s.slice(last, m.index) });
      const tok = m[0];
      if (tok.startsWith("***")) runs.push({ t: tok.slice(3, -3), b: true, i: true });
      else if (tok.startsWith("**") || tok.startsWith("__")) runs.push({ t: tok.slice(2, -2), b: true });
      else runs.push({ t: tok.slice(1, -1), i: true });
      last = m.index + tok.length;
    }
    if (last < s.length) runs.push({ t: s.slice(last) });
    return runs;
  };
  const para = (runs: Run[], o: { size?: number; bold?: boolean; indent?: boolean } = {}): string => {
    const all = runs.map((r) => r.t).join("");
    const rtl = hasArabic(all);
    const ppr = `<w:pPr>${rtl ? "<w:bidi/>" : ""}${o.indent ? '<w:ind w:left="360" w:hanging="260"/>' : ""}<w:spacing w:after="120"/></w:pPr>`;
    const rs = runs.map((r) => {
      const parts = clean(r.t).split("\n");
      const rpr = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>${r.b || o.bold ? "<w:b/><w:bCs/>" : ""}${r.i ? "<w:i/><w:iCs/>" : ""}${rtl ? "<w:rtl/>" : ""}${o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : ""}</w:rPr>`;
      return `<w:r>${rpr}${parts.map((t, i) => (i ? "<w:br/>" : "") + `<w:t xml:space="preserve">${esc(t)}</w:t>`).join("")}</w:r>`;
    }).join("");
    return `<w:p>${ppr}${rs}</w:p>`;
  };
  const body: string[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let buf: string[] = [];
  const flush = () => { if (buf.length) { body.push(para(inline(buf.join(markdown ? " " : "\n")))); buf = []; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { flush(); continue; }
    const h = markdown ? /^(#{1,6})\s+(.*)$/.exec(line) : null;
    const li = markdown ? /^\s*[-*+]\s+(.*)$/.exec(line) : null;
    const ol = markdown ? /^\s*(\d+)[.)]\s+(.*)$/.exec(line) : null;
    if (h) { flush(); body.push(para(inline(h[2]), { size: [44, 36, 30, 26, 24, 22][h[1].length - 1], bold: true })); }
    else if (li) { flush(); body.push(para([{ t: "•\u00A0" }, ...inline(li[1])], { indent: true })); }
    else if (ol) { flush(); body.push(para([{ t: ol[1] + ".\u00A0" }, ...inline(ol[2])], { indent: true })); }
    else buf.push(line);
  }
  flush();
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="${WNS}"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const files: ZipFile[] = [
    { name: "[Content_Types].xml", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { name: "_rels/.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: "word/document.xml", data: enc.encode(doc) },
  ];
  return zipStore(files);
}

/* =============================== CSV / JSON =============================== */
export type Rows = string[][];

export function detectDelimiter(text: string): string {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => l.trim()) ?? "";
  let best = ",", bestN = 0;
  for (const d of [",", ";", "\t", "|"]) {
    let n = 0, q = false;
    for (const ch of first) { if (ch === '"') q = !q; else if (ch === d && !q) n++; }
    if (n > bestN) { best = d; bestN = n; }
  }
  return best;
}

export function parseCsv(text: string, delim?: string): { rows: Rows; delim: string } {
  const src = text.replace(/^\uFEFF/, "");
  const d = delim ?? detectDelimiter(src);
  const rows: Rows = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"' && cell === "") q = true;
    else if (ch === d) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  return { rows, delim: d };
}

export function toCsv(rows: Rows, delim = ",", bom = true): string {
  const q = (c: string) => (c.includes(delim) || /["\r\n]/.test(c) || /^\s|\s$/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return (bom ? "\uFEFF" : "") + rows.map((r) => r.map(q).join(delim)).join("\r\n") + "\r\n";
}

const cellText = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export function jsonToRows(text: string): Rows {
  let data: unknown = JSON.parse(text);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const arrays = Object.values(data as Record<string, unknown>).filter(Array.isArray);
    if (arrays.length === 1) data = arrays[0];
    else return [["key", "value"], ...Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, cellText(v)])];
  }
  if (!Array.isArray(data)) return [["value"], [cellText(data)]];
  if (data.every((x) => Array.isArray(x))) return (data as unknown[][]).map((r) => r.map(cellText));
  const keys: string[] = [];
  for (const o of data) if (o && typeof o === "object") for (const k of Object.keys(o as object)) if (!keys.includes(k)) keys.push(k);
  if (!keys.length) return [["value"], ...data.map((x) => [cellText(x)])];
  return [keys, ...data.map((o) => keys.map((k) => cellText((o as Record<string, unknown>)?.[k])))];
}

export function rowsToJson(rows: Rows, header = true, autoType = true): string {
  const conv = (v: string): unknown => {
    if (!autoType) return v;
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && v.length < 16) return Number(v);
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  };
  if (!header) return JSON.stringify(rows.map((r) => r.map(conv)), null, 2) + "\n";
  const names: string[] = [];
  (rows[0] ?? []).forEach((h, i) => {
    let n = h.trim() || `col${i + 1}`;
    while (names.includes(n)) n += "_2";
    names.push(n);
  });
  return JSON.stringify(rows.slice(1).map((r) => Object.fromEntries(names.map((n, i) => [n, conv(r[i] ?? "")]))), null, 2) + "\n";
}

/* =============================== XLSX =============================== */
export type Sheet = { name: string; rows: Rows };

const colIndex = (ref: string): number => {
  let n = 0;
  for (const ch of /^[A-Z]+/i.exec(ref)?.[0] ?? "A") n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return n - 1;
};
const colName = (i: number): string => {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

export async function readXlsx(buf: Uint8Array): Promise<Sheet[]> {
  const z = zipOpen(buf);
  const wbText = await z.text("xl/workbook.xml");
  if (!wbText) throw new Error("xlsx");
  const wb = xml(wbText);
  const rels = new Map<string, string>();
  const relText = await z.text("xl/_rels/workbook.xml.rels");
  if (relText) for (const r of Array.from(xml(relText).getElementsByTagName("Relationship"))) rels.set(r.getAttribute("Id") ?? "", r.getAttribute("Target") ?? "");
  const shared: string[] = [];
  const ssText = await z.text("xl/sharedStrings.xml");
  if (ssText) {
    for (const si of Array.from(xml(ssText).getElementsByTagName("si"))) {
      let t = "";
      for (const tt of Array.from(si.getElementsByTagName("t"))) {
        let p: Element | null = tt.parentElement, inPhonetic = false;
        while (p && p !== si) { if (p.localName === "rPh") inPhonetic = true; p = p.parentElement; }
        if (!inPhonetic) t += tt.textContent ?? "";
      }
      shared.push(t);
    }
  }
  const out: Sheet[] = [];
  const sheets = Array.from(wb.getElementsByTagName("sheet"));
  for (let si = 0; si < sheets.length; si++) {
    const name = sheets[si].getAttribute("name") ?? `Sheet${si + 1}`;
    const target = rels.get(sheets[si].getAttributeNS(RNS, "id") ?? "") ?? `worksheets/sheet${si + 1}.xml`;
    const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const text = await z.text(path);
    if (!text) continue;
    const rows: Rows = [];
    let maxCol = 0;
    let rowNo = 0;
    for (const row of Array.from(xml(text).getElementsByTagName("row"))) {
      const rn = parseInt(row.getAttribute("r") ?? "", 10);
      rowNo = Number.isFinite(rn) ? rn - 1 : rowNo;
      const cells: string[] = [];
      for (const c of Array.from(row.getElementsByTagName("c"))) {
        const ref = c.getAttribute("r") ?? "", t = c.getAttribute("t");
        const ci = ref ? colIndex(ref) : cells.length;
        const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
        let val = v;
        if (t === "s") val = shared[parseInt(v, 10)] ?? "";
        else if (t === "inlineStr") val = Array.from(c.getElementsByTagName("t")).map((x) => x.textContent ?? "").join("");
        else if (t === "b") val = v === "1" ? "TRUE" : "FALSE";
        while (cells.length < ci) cells.push("");
        cells[ci] = val;
        maxCol = Math.max(maxCol, ci + 1);
      }
      while (rows.length < rowNo) rows.push([]);
      rows[rowNo] = cells;
      rowNo++;
    }
    while (rows.length && (!rows[rows.length - 1] || rows[rows.length - 1].every((c) => c === ""))) rows.pop();
    out.push({ name, rows: rows.map((r) => Array.from({ length: maxCol }, (_, i) => r?.[i] ?? "")) });
  }
  return out;
}

const safeSheet = (n: string): string => (n.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet1");

export function rowsToXlsx(rows: Rows, name = "Sheet1", boldHeader = true): Uint8Array {
  const rtl = rows.slice(0, 50).some((r) => r.some(hasArabic));
  const width: number[] = [];
  rows.slice(0, 200).forEach((r) => r.forEach((c, i) => { width[i] = Math.min(60, Math.max(width[i] ?? 8, c.length + 2)); }));
  const data = rows.map((r, ri) =>
    `<row r="${ri + 1}">` + r.map((c, ci) => {
      const ref = colName(ci) + (ri + 1), s = boldHeader && ri === 0 ? ' s="1"' : "";
      if (c === "") return "";
      if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(c) && c.length < 16 && !(boldHeader && ri === 0)) return `<c r="${ref}"${s}><v>${c}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(clean(c))}</t></is></c>`;
    }).join("") + "</row>").join("");
  const cols = width.length ? `<cols>${width.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ""}${boldHeader ? '><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>' : "/>"}</sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const files: ZipFile[] = [
    { name: "[Content_Types].xml", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>') },
    { name: "_rels/.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${RNS}"><sheets><sheet name="${esc(safeSheet(name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>') },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheet) },
    { name: "xl/styles.xml", data: enc.encode(styles) },
  ];
  return zipStore(files);
}

/* =============================== PPTX =============================== */
export async function readPptx(buf: Uint8Array): Promise<string[][]> {
  const z = zipOpen(buf);
  const names = z.names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  const slides: string[][] = [];
  for (const n of names) {
    const d = xml((await z.text(n)) ?? "");
    const paras: string[] = [];
    for (const p of Array.from(d.getElementsByTagNameNS(ANS, "p"))) {
      const t = Array.from(p.getElementsByTagNameNS(ANS, "t")).map((x) => x.textContent ?? "").join("");
      if (t.trim()) paras.push(t);
    }
    slides.push(paras);
  }
  return slides;
}

export const slidesToText = (s: string[][]): string => s.map((p, i) => `--- ${i + 1} ---\n${p.join("\n")}`).join("\n\n") + "\n";
export const slidesToMd = (s: string[][]): string =>
  s.map((p, i) => `## ${i + 1}. ${p[0] ?? ""}\n\n${p.slice(1).map((x) => "- " + x).join("\n")}`.trim()).join("\n\n") + "\n";

/* =============================== Markdown / HTML =============================== */
const inlineMd = (s: string): string => {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, "$1<em>$2</em>").replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>");
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => (/^(https?:|mailto:|#|\/)/i.test(url.replace(/&amp;/g, "&")) ? `<a href="${url}">${text}</a>` : text));
  return t;
};

export function mdToHtmlBody(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    } else if (!l.trim()) i++;
    else if (/^#{1,6}\s/.test(l)) {
      const m = /^(#{1,6})\s+(.*)$/.exec(l)!;
      out.push(`<h${m[1].length}>${inlineMd(m[2].replace(/\s+#+\s*$/, ""))}</h${m[1].length}>`);
      i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push("<hr>"); i++; }
    else if (/^\s*>/.test(l)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${mdToHtmlBody(q.join("\n"))}</blockquote>`);
    } else if (l.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(l);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push("<table><thead><tr>" + head.map((c) => `<th>${inlineMd(c)}</th>`).join("") + "</tr></thead><tbody>" + rows.map((r) => "<tr>" + r.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>");
    } else if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l), items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ""));
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s+)/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))) para.push(lines[i++]);
      out.push(`<p>${inlineMd(para.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

const PAGE_CSS = "body{font:16px/1.7 system-ui,'Segoe UI',Tahoma,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#111}pre{background:#f4f4f6;padding:12px;overflow:auto}code{background:#f4f4f6;padding:1px 4px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 8px}blockquote{margin:0;padding-inline-start:1rem;border-inline-start:3px solid #bbb;color:#444}";

export function mdToHtml(md: string, title = "Document"): string {
  const rtl = hasArabic(md);
  return `<!doctype html>\n<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">\n<head>\n<meta charset="utf-8">\n<title>${esc(title)}</title>\n<style>${PAGE_CSS}</style>\n</head>\n<body>\n${mdToHtmlBody(md)}\n</body>\n</html>\n`;
}

/** Removes everything that can run code. Used before showing a user's HTML file in the print view. */
export function sanitizeHtml(html: string): { body: string; title: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,base,form,noscript,template").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
      if (n.startsWith("on") || n === "style" || ((n === "href" || n === "src" || n === "xlink:href") && /^(javascript|data|vbscript):/.test(v))) el.removeAttribute(a.name);
    }
  });
  return { body: doc.body.innerHTML, title: doc.title || "" };
}

const BLOCKS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TR", "SECTION", "ARTICLE", "UL", "OL", "TABLE", "BLOCKQUOTE", "PRE", "HR", "HEADER", "FOOTER"]);
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,template").forEach((n) => n.remove());
  let out = "";
  const walk = (n: Node) => {
    if (n.nodeType === 3) { out += (n.textContent ?? "").replace(/\s+/g, " "); return; }
    if (n.nodeType !== 1) return;
    const el = n as Element, tag = el.tagName;
    if (tag === "BR") { out += "\n"; return; }
    if (tag === "LI") out += "\n- ";
    else if (BLOCKS.has(tag)) out += "\n";
    if (tag === "TD" || tag === "TH") out += " ";
    el.childNodes.forEach(walk);
    if (BLOCKS.has(tag) && tag !== "LI") out += "\n";
  };
  walk(doc.body);
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* =============================== print to PDF =============================== */
/**
 * Opens the browser's own "Save as PDF" print dialog for a document. This is the only way to get a PDF with
 * real selectable text in every language (Arabic included) without shipping a font engine.
 */
export function printDocument(innerHtml: string, rtl: boolean): void {
  document.getElementById("cv-print-root")?.remove();
  const root = document.createElement("div");
  root.id = "cv-print-root";
  root.setAttribute("dir", rtl ? "rtl" : "ltr");
  root.innerHTML = innerHtml;
  document.body.appendChild(root);
  const done = () => { root.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}

