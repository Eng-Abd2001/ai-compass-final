/** Small byte helpers shared by the converters. No imports, no side effects. */
export const enc = new TextEncoder();
export const dec = new TextDecoder("utf-8");

/** Wraps bytes in a Blob (the cast keeps newer TypeScript lib typings happy). */
export const blobOf = (parts: Uint8Array[], type: string): Blob => new Blob(parts as unknown as BlobPart[], { type });

export const bytesOf = async (b: Blob): Promise<Uint8Array> => new Uint8Array(await b.arrayBuffer());

export function concat(chunks: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export const u16 = (v: number): number[] => [v & 255, (v >>> 8) & 255];
export const u32 = (v: number): number[] => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];

export const hasArabic = (s: string): boolean => /[\u0590-\u08FF\uFB1D-\uFEFC]/.test(s);

export function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1048576).toFixed(n < 10485760 ? 2 : 1)} MB`;
}

/** Safe base name for downloads (keeps Arabic and Latin letters, digits, dot, dash). */
export function baseName(name: string): string {
  const n = name.replace(/\.[^.]*$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").trim();
  return n || "file";
}

/** Replaces {0}, {1}... in a UI string. */
export const fmt = (s: string, ...v: (string | number)[]): string => s.replace(/\{(\d+)\}/g, (_m, i: string) => String(v[Number(i)] ?? ""));
