const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
export const toHex = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
export const rgbOf = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
export const lum = (h: string): number => { const [r, g, b] = rgbOf(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** Black or white, whichever reads better on this colour. */
export const textOn = (h: string): string => (lum(h) > 0.4 ? "#0B0D12" : "#FFFFFF");
export const contrast = (a: string, b: string): number => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

type Box = { px: number[] };
/** Median-cut palette of the n most important colours, most common first. */
export function extractPalette(data: Uint8ClampedArray, n = 6): string[] {
  const all: number[] = [];
  const step = Math.max(1, Math.floor(data.length / 4 / 40000));
  for (let i = 0; i < data.length / 4; i += step) if (data[i * 4 + 3] > 200) all.push(i * 4);
  if (!all.length) return [];
  let boxes: Box[] = [{ px: all }];
  while (boxes.length < n * 2) {
    let bi = -1, bs = 0, bc = 0;
    boxes.forEach((b, i) => {
      if (b.px.length < 2) return;
      const mm = [255, 0, 255, 0, 255, 0];
      for (const p of b.px) for (let c = 0; c < 3; c++) { const v = data[p + c]; if (v < mm[c * 2]) mm[c * 2] = v; if (v > mm[c * 2 + 1]) mm[c * 2 + 1] = v; }
      const rng = [mm[1] - mm[0], mm[3] - mm[2], mm[5] - mm[4]], c = rng.indexOf(Math.max(...rng)), score = rng[c] * Math.sqrt(b.px.length);
      if (score > bs) { bs = score; bi = i; bc = c; }
    });
    if (bi < 0) break;
    const b = boxes[bi];
    b.px.sort((x, y) => data[x + bc] - data[y + bc]);
    const mid = b.px.length >> 1;
    boxes.splice(bi, 1, { px: b.px.slice(0, mid) }, { px: b.px.slice(mid) });
  }
  const cols = boxes.map((b) => {
    let r = 0, g = 0, bl = 0;
    for (const p of b.px) { r += data[p]; g += data[p + 1]; bl += data[p + 2]; }
    const k = b.px.length || 1;
    return { hex: toHex(r / k, g / k, bl / k), n: b.px.length };
  }).sort((a, b) => b.n - a.n);
  const out: string[] = [];
  for (const c of cols) {
    const [r, g, b] = rgbOf(c.hex);
    if (out.every((o) => { const [x, y, z] = rgbOf(o); return Math.hypot(r - x, g - y, b - z) > 38; })) out.push(c.hex);
    if (out.length === n) break;
  }
  for (const c of cols) if (out.length < n && !out.includes(c.hex)) out.push(c.hex);
  return out.slice(0, n);
}
export const gradientCss = (cols: string[], angle: number): string => `linear-gradient(${angle}deg, ${cols.join(", ")})`;
export const cssVars = (cols: string[]): string => `:root {\n${cols.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n")}\n}`;
