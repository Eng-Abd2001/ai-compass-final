/** Static GIF encoder: median-cut palette + LZW, optional 1-bit transparency. */

type Box = { idx: number[]; };

function medianCut(px: Uint8ClampedArray, step: number, maxColors: number): number[][] {
  const samples: number[] = [];
  for (let i = 0; i < px.length / 4; i += step) if (px[i * 4 + 3] >= 128) samples.push(i * 4);
  if (!samples.length) return [[0, 0, 0]];
  const boxes: Box[] = [{ idx: samples }];
  const range = (b: Box) => {
    let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
    for (const i of b.idx) {
      const r = px[i], g = px[i + 1], bl = px[i + 2];
      if (r < rmin) rmin = r; if (r > rmax) rmax = r;
      if (g < gmin) gmin = g; if (g > gmax) gmax = g;
      if (bl < bmin) bmin = bl; if (bl > bmax) bmax = bl;
    }
    const rr = rmax - rmin, gr = gmax - gmin, br = bmax - bmin;
    return rr >= gr && rr >= br ? { ch: 0, size: rr } : gr >= br ? { ch: 1, size: gr } : { ch: 2, size: br };
  };
  while (boxes.length < maxColors) {
    let best = -1, bestScore = 0, bestCh = 0;
    boxes.forEach((b, i) => {
      if (b.idx.length < 2) return;
      const r = range(b), score = r.size * Math.log2(b.idx.length + 1);
      if (score > bestScore) { bestScore = score; best = i; bestCh = r.ch; }
    });
    if (best < 0 || bestScore === 0) break;
    const b = boxes[best];
    b.idx.sort((a, c) => px[a + bestCh] - px[c + bestCh]);
    const mid = b.idx.length >> 1;
    boxes.splice(best, 1, { idx: b.idx.slice(0, mid) }, { idx: b.idx.slice(mid) });
  }
  return boxes.map((b) => {
    let r = 0, g = 0, bl = 0;
    for (const i of b.idx) { r += px[i]; g += px[i + 1]; bl += px[i + 2]; }
    const n = b.idx.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
}

function lzw(minCode: number, idx: Uint8Array): number[] {
  const clear = 1 << minCode, eoi = clear + 1;
  let next = eoi + 1, size = minCode + 1;
  let table = new Map<number, number>();
  const out: number[] = [];
  let cur = 0, shift = 0;
  const emit = (code: number) => {
    cur |= code << shift;
    shift += size;
    while (shift >= 8) { out.push(cur & 255); cur >>>= 8; shift -= 8; }
  };
  emit(clear);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = (prefix << 8) | k, hit = table.get(key);
    if (hit === undefined) {
      emit(prefix);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1; size = minCode + 1; table = new Map();
      } else {
        if (next >= 1 << size) size++;
        table.set(key, next++);
      }
      prefix = k;
    } else prefix = hit;
  }
  emit(prefix);
  emit(eoi);
  if (shift > 0) out.push(cur & 255);
  return out;
}

export function encodeGif(img: ImageData): Uint8Array {
  const { width: w, height: h, data: px } = img;
  let transparent = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 128) { transparent = true; break; }
  const step = Math.max(1, Math.floor((w * h) / 60000));
  const pal = medianCut(px, step, transparent ? 255 : 256);
  const transIdx = transparent ? pal.length : -1;
  const count = pal.length + (transparent ? 1 : 0);
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, count))));
  const tableSize = 1 << bits;
  const cache = new Int16Array(32768).fill(-1);
  const idx = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (transparent && px[o + 3] < 128) { idx[i] = transIdx; continue; }
    const r = px[o], g = px[o + 1], b = px[o + 2], key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let c = cache[key];
    if (c < 0) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < pal.length; j++) {
        const dr = pal[j][0] - r, dg = pal[j][1] - g, db = pal[j][2] - b, d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
        if (d < bd) { bd = d; best = j; }
      }
      c = cache[key] = best;
    }
    idx[i] = c;
  }
  const out: number[] = [];
  const push = (...v: number[]) => { for (const x of v) out.push(x); };
  for (const ch of "GIF89a") push(ch.charCodeAt(0));
  push(w & 255, w >> 8, h & 255, h >> 8, 0x80 | 0x70 | (bits - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) { const c = pal[i] || [0, 0, 0]; push(c[0], c[1], c[2]); }
  if (transparent) push(0x21, 0xf9, 4, 1, 0, 0, transIdx, 0);
  push(0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0);
  const minCode = Math.max(2, bits);
  push(minCode);
  const data = lzw(minCode, idx);
  for (let i = 0; i < data.length; i += 255) {
    const n = Math.min(255, data.length - i);
    push(n);
    for (let j = 0; j < n; j++) out.push(data[i + j]);
  }
  push(0, 0x3b);
  return new Uint8Array(out);
}
