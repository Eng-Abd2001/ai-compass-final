/** QR Code generator (ISO/IEC 18004), byte mode, versions 1-40, error correction L/M/Q/H. No dependencies. */
export type Ecl = "L" | "M" | "Q" | "H";
const IDX: Record<Ecl, number> = { L: 0, M: 1, Q: 2, H: 3 };
const FMT: Record<Ecl, number> = { L: 1, M: 0, Q: 3, H: 2 };
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const rawModules = (v: number): number => {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; }
  return r;
};
const dataCodewords = (v: number, e: Ecl): number => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[IDX[e]][v] * NUM_BLOCKS[IDX[e]][v];

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}
function rsDivisor(deg: number): number[] {
  const r = new Array<number>(deg).fill(0);
  r[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) { r[j] = gfMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data: number[], div: number[]): number[] {
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

export type QrCode = { size: number; version: number; modules: boolean[][] };

export function encodeQr(text: string, ecl: Ecl = "M"): QrCode {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 0;
  for (let v = 1; v <= 40; v++) {
    const cc = v < 10 ? 8 : 16;
    if (4 + cc + bytes.length * 8 <= dataCodewords(v, ecl) * 8 && (cc === 16 || bytes.length < 256)) { version = v; break; }
  }
  if (!version) throw new Error("too-long");
  const bits: number[] = [];
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(version, ecl) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

  // error correction + interleave
  const nb = NUM_BLOCKS[IDX[ecl]][version], eccLen = ECC_PER_BLOCK[IDX[ecl]][version];
  const raw = Math.floor(rawModules(version) / 8), shortBlocks = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen), blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
    k += d.length;
    const ecc = rsRemainder(d, div);
    if (i < shortBlocks) d.push(0);
    blocks.push(d.concat(ecc));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) all.push(b[i]); });

  // matrix
  const size = version * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align: number[] = [];
  if (version > 1) {
    const n = Math.floor(version / 7) + 2, step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2;
    align.push(6);
    for (let p = size - 7; align.length < n; p -= step) align.splice(1, 0, p);
  }
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;
  const formatBits = (mask: number) => {
    const d = (FMT[ecl] << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(b, i));
    setFn(8, 7, bit(b, 6)); setFn(8, 8, bit(b, 7)); setFn(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(b, i));
    setFn(8, size - 8, true);
  };
  formatBits(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (version << 12) | rem;
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3), d = bit(b, i); setFn(a, c, d); setFn(c, a, d); }
  }
  // data placement
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < all.length * 8) { mod[y][x] = bit(all[bi >>> 3], 7 - (bi & 7)); bi++; }
    }
  }
  const mask = (m: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const inv = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0, (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (((x + y) % 2) + ((x * y) % 3)) % 2 === 0][m];
      if (!fn[y][x] && inv) mod[y][x] = !mod[y][x];
    }
  };
  const penalty = (): number => {
    let p = 0;
    const line = (get: (i: number) => boolean) => {
      let run = 1, prev = get(0);
      for (let i = 1; i < size; i++) { if (get(i) === prev) run++; else { if (run >= 5) p += run - 2; run = 1; prev = get(i); } }
      if (run >= 5) p += run - 2;
    };
    for (let i = 0; i < size; i++) { line((k) => mod[i][k]); line((k) => mod[k][i]); }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
    const pat = [true, false, true, true, true, false, true, false, false, false, false];
    const match = (get: (k: number) => boolean, s: number) => pat.every((v, k) => get(s + k) === v) || pat.every((v, k) => get(s + 10 - k) === v);
    for (let i = 0; i < size; i++) for (let s = 0; s <= size - 11; s++) { if (match((k) => mod[i][k], s)) p += 40; if (match((k) => mod[k][i], s)) p += 40; }
    const dark = mod.reduce((s, r) => s + r.filter(Boolean).length, 0);
    p += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    mask(m); formatBits(m);
    const p = penalty();
    if (p < bestP) { best = m; bestP = p; }
    mask(m);
  }
  mask(best); formatBits(best);
  return { size, version, modules: mod };
}

export function qrSvg(q: QrCode, o: { fg: string; bg: string; border: number }): string {
  const n = q.size + o.border * 2;
  let d = "";
  q.modules.forEach((row, y) => { let x = 0; while (x < q.size) { if (!row[x]) { x++; continue; } let w = 1; while (x + w < q.size && row[x + w]) w++; d += `M${x + o.border} ${y + o.border}h${w}v1h-${w}z`; x += w; } });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${o.bg}"/><path d="${d}" fill="${o.fg}"/></svg>`;
}

export function qrCanvas(q: QrCode, o: { fg: string; bg: string; border: number; px: number }): HTMLCanvasElement {
  const c = document.createElement("canvas"), n = q.size + o.border * 2;
  c.width = c.height = n * o.px;
  const x = c.getContext("2d")!;
  x.fillStyle = o.bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = o.fg;
  q.modules.forEach((row, yy) => row.forEach((on, xx) => { if (on) x.fillRect((xx + o.border) * o.px, (yy + o.border) * o.px, o.px, o.px); }));
  return c;
}

const wesc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
export type WifiEnc = "WPA" | "WEP" | "nopass";
export const wifiString = (ssid: string, pass: string, enc: WifiEnc, hidden: boolean): string =>
  `WIFI:T:${enc};S:${wesc(ssid)};${enc === "nopass" ? "" : `P:${wesc(pass)};`}${hidden ? "H:true;" : ""};`;
const vesc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
export type VCard = { first: string; last: string; org: string; title: string; phone: string; email: string; url: string };
export const vcardString = (v: VCard): string =>
  ["BEGIN:VCARD", "VERSION:3.0", `N:${vesc(v.last)};${vesc(v.first)};;;`, `FN:${vesc(`${v.first} ${v.last}`.trim())}`,
    v.org && `ORG:${vesc(v.org)}`, v.title && `TITLE:${vesc(v.title)}`, v.phone && `TEL;TYPE=CELL:${v.phone}`, v.email && `EMAIL:${v.email}`, v.url && `URL:${v.url}`, "END:VCARD"]
    .filter(Boolean).join("\n");
