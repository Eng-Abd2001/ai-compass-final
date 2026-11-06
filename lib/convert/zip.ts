import { blobOf, concat, dec, enc, u16, u32 } from "./bytes";

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(d: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = TABLE[(c ^ d[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipFile = { name: string; data: Uint8Array };

/** Writes a ZIP with stored (uncompressed) entries. Valid for downloads, DOCX, XLSX and PPTX. */
export function zipStore(files: ZipFile[]): Uint8Array {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const head = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(time), ...u16(date),
      ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0),
    ]);
    parts.push(head, name, f.data);
    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(time), ...u16(date),
      ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ]), name);
    offset += head.length + name.length + f.data.length;
  }
  const cd = concat(central);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cd.length), ...u32(offset), ...u16(0)]);
  return concat([...parts, cd, end]);
}

export const zipBlob = (files: ZipFile[]): Blob => blobOf([zipStore(files)], "application/zip");

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export type ZipReader = { names: string[]; read: (name: string) => Promise<Uint8Array | undefined>; text: (name: string) => Promise<string | undefined> };

/** Opens a ZIP (stored or deflated entries) using the central directory. */
export function zipOpen(buf: Uint8Array): ZipReader {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not-a-zip");
  const total = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries = new Map<string, { method: number; csize: number; offset: number }>();
  for (let i = 0; i < total; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("bad-zip");
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    entries.set(dec.decode(buf.subarray(p + 46, p + 46 + nl)), { method, csize, offset });
    p += 46 + nl + el + cl;
  }
  const read = async (name: string): Promise<Uint8Array | undefined> => {
    const e = entries.get(name);
    if (!e) return undefined;
    const nl = v.getUint16(e.offset + 26, true), el = v.getUint16(e.offset + 28, true);
    const start = e.offset + 30 + nl + el;
    const raw = buf.subarray(start, start + e.csize);
    if (e.method === 0) return raw;
    if (e.method === 8) return inflateRaw(raw);
    throw new Error("zip-method");
  };
  return {
    names: [...entries.keys()],
    read,
    text: async (name) => { const d = await read(name); return d ? dec.decode(d) : undefined; },
  };
}
