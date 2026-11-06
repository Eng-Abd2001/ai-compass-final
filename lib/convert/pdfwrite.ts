import { concat, enc } from "./bytes";

/** A page made from one JPEG image. */
/** `pt` sets the exact page size in points (used when re-building an existing PDF). */
export type PdfImagePage = { jpeg: Uint8Array; w: number; h: number; gray?: boolean; pt?: [number, number] };
export type PageSize = "fit" | "a4" | "letter";
export type Orient = "auto" | "portrait" | "landscape";
export type PageSpec = { size: PageSize; orient: Orient; margin: number }; // margin in points

const SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** Minimal PDF 1.4 writer: one DCT (JPEG) image per page, nothing else, no metadata. */
export function buildPdf(pages: PdfImagePage[], spec: PageSpec): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const put = (d: Uint8Array | string) => { const b = typeof d === "string" ? enc.encode(d) : d; chunks.push(b); pos += b.length; };
  const obj = (id: number, body: () => void) => { offsets[id] = pos; put(`${id} 0 obj\n`); body(); put("\nendobj\n"); };
  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => put(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const pid = 3 + i * 3, cid = pid + 1, iid = pid + 2;
    let W: number, H: number, dw: number, dh: number, x: number, y: number;
    if (p.pt) {
      W = p.pt[0]; H = p.pt[1]; dw = W; dh = H; x = 0; y = 0;
    } else if (spec.size === "fit") {
      let s = 0.75;
      const long = Math.max(p.w, p.h) * s;
      if (long > 1800) s *= 1800 / long;
      W = p.w * s; H = p.h * s; dw = W; dh = H; x = 0; y = 0;
    } else {
      let [pw, ph] = SIZES[spec.size];
      const land = spec.orient === "landscape" || (spec.orient === "auto" && p.w > p.h);
      if (land) [pw, ph] = [ph, pw];
      W = pw; H = ph;
      const bw = W - spec.margin * 2, bh = H - spec.margin * 2, k = Math.min(bw / p.w, bh / p.h);
      dw = p.w * k; dh = p.h * k; x = (W - dw) / 2; y = (H - dh) / 2;
    }
    obj(pid, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(W)} ${n2(H)}] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>`));
    const content = `q ${n2(dw)} 0 0 ${n2(dh)} ${n2(x)} ${n2(y)} cm /Im0 Do Q`;
    obj(cid, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(iid, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /${p.gray ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      put(p.jpeg);
      put("\nendstream");
    });
  });
  const total = 3 + pages.length * 3;
  const xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  put(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return concat(chunks);
}
