import { u16, u32 } from "./bytes";

/** 24-bit uncompressed BMP. Transparent pixels must already be flattened onto a background. */
export function encodeBmp(img: ImageData): Uint8Array {
  const { width: w, height: h, data } = img;
  const row = (w * 3 + 3) & ~3, size = row * h;
  const out = new Uint8Array(54 + size);
  out.set([0x42, 0x4d, ...u32(54 + size), ...u32(0), ...u32(54), ...u32(40), ...u32(w), ...u32(h), ...u16(1), ...u16(24), ...u32(0), ...u32(size), ...u32(2835), ...u32(2835), ...u32(0), ...u32(0)]);
  for (let y = 0; y < h; y++) {
    let o = 54 + (h - 1 - y) * row;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[o++] = data[i + 2]; out[o++] = data[i + 1]; out[o++] = data[i];
    }
  }
  return out;
}
