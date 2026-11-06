export type Ratio = "9:16" | "16:9" | "1:1" | "4:5";
export const RATIO_PX: Record<Ratio, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1440, 1440], "4:5": [1200, 1500] };
export type ThemeId = "aurora" | "sunset" | "ocean" | "forest" | "candy" | "midnight";
export const THEMES: Record<ThemeId, [string, string, string]> = {
  aurora: ["#7C3AED", "#2563EB", "#06B6D4"], sunset: ["#F97316", "#EC4899", "#7C3AED"], ocean: ["#0EA5E9", "#2563EB", "#1E1B4B"],
  forest: ["#22C55E", "#0F766E", "#052E2B"], candy: ["#F472B6", "#A78BFA", "#60A5FA"], midnight: ["#1E293B", "#334155", "#0F172A"],
};
export type MockOpts = { mode: "code" | "quote"; text: string; title: string; author: string; theme: ThemeId; ratio: Ratio; lineNumbers: boolean; size: number };

const KW = new Set("const let var function return if else for while class import from export default new async await try catch throw switch case break continue typeof def lambda in is not and or None True False self print pass with as yield interface type extends implements public private static void int string bool true false null undefined fn pub use mut struct enum impl".split(" "));
type Tok = { t: string; c: string };
function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /(\/\/.*|#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  for (const m of line.matchAll(re)) {
    if (m[1]) out.push({ t: m[1], c: "#7F8CA6" });
    else if (m[2]) out.push({ t: m[2], c: "#A5E3A0" });
    else if (m[3]) out.push({ t: m[3], c: "#F5B97A" });
    else if (m[4]) out.push({ t: m[4], c: KW.has(m[4]) ? "#C792EA" : /^[A-Z]/.test(m[4]) ? "#7FDBFF" : "#E6EDF7" });
    else out.push({ t: m[0], c: m[5] ? "#E6EDF7" : "#89DDFF" });
  }
  return out;
}
function rr(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}
const isRtl = (s: string) => /[\u0590-\u08FF]/.test(s);

/** Draws the picture. scale 1 = full size (1080-1920 px); the on-screen preview uses a small scale so typing stays instant. */
export function drawMockup(c: HTMLCanvasElement, o: MockOpts, scale = 1): void {
  const [W, H] = RATIO_PX[o.ratio];
  c.width = Math.round(W * scale); c.height = Math.round(H * scale);
  const x = c.getContext("2d")!;
  x.setTransform(scale, 0, 0, scale, 0, 0);
  const [a, b, d] = THEMES[o.theme];
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, d);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (const [cx, cy, r, col] of [[0.15, 0.2, 0.45, a], [0.9, 0.85, 0.5, d], [0.8, 0.1, 0.3, "#ffffff"]] as [number, number, number, string][]) {
    const rg = x.createRadialGradient(cx * W, cy * H, 0, cx * W, cy * H, r * Math.max(W, H));
    rg.addColorStop(0, col + "AA"); rg.addColorStop(1, col + "00");
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
  }
  const pad = Math.round(Math.min(W, H) * 0.09), cw = W - pad * 2, ch = H - pad * 2;
  x.save();
  x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 80; x.shadowOffsetY = 30;
  rr(x, pad, pad, cw, ch, 44); x.fillStyle = "rgba(10,12,22,.62)"; x.fill();
  x.restore();
  rr(x, pad, pad, cw, ch, 44); x.strokeStyle = "rgba(255,255,255,.28)"; x.lineWidth = 2; x.stroke();
  const inner = pad + 40;
  if (o.mode === "code") {
    ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => { x.beginPath(); x.arc(pad + 56 + i * 44, pad + 56, 14, 0, Math.PI * 2); x.fillStyle = col; x.fill(); });
    x.font = "600 30px ui-monospace, Menlo, Consolas, monospace"; x.fillStyle = "rgba(255,255,255,.55)"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(o.title, W / 2, pad + 56);
    const lines = o.text.replace(/\t/g, "  ").split("\n").slice(0, 60);
    const top = pad + 120, availH = ch - 150, availW = cw - 80;
    let fs = o.size;
    const gut = (n: number) => (o.lineNumbers ? String(n).length * 0.62 * fs + 28 : 0);
    const fit = () => {
      x.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`;
      const wMax = Math.max(...lines.map((l) => x.measureText(l).width), 1);
      return wMax + gut(lines.length) <= availW && lines.length * fs * 1.55 <= availH;
    };
    while (fs > 14 && !fit()) fs -= 1;
    x.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`; x.textAlign = "left"; x.textBaseline = "alphabetic";
    const lh = fs * 1.55, g0 = gut(lines.length);
    lines.forEach((ln, i) => {
      const y = top + fs + i * lh;
      if (o.lineNumbers) { x.fillStyle = "rgba(255,255,255,.28)"; x.textAlign = "right"; x.fillText(String(i + 1), inner + g0 - 20, y); x.textAlign = "left"; }
      let px = inner + g0;
      for (const t of tokenize(ln)) { x.fillStyle = t.c; x.fillText(t.t, px, y); px += x.measureText(t.t).width; }
    });
  } else {
    const rtl = isRtl(o.text);
    x.direction = rtl ? "rtl" : "ltr"; x.textAlign = "center"; x.textBaseline = "alphabetic";
    const font = (s: number) => `600 ${s}px "IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif`;
    const maxW = cw - 140;
    let fs = Math.round(o.size * 2.4), lines: string[] = [];
    const wrap = () => {
      x.font = font(fs);
      lines = [];
      let cur = "";
      for (const w of o.text.trim().split(/\s+/)) { const t = cur ? `${cur} ${w}` : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
    };
    wrap();
    while (fs > 28 && lines.length * fs * 1.5 > ch - 360) { fs -= 3; wrap(); }
    const block = lines.length * fs * 1.5, y0 = H / 2 - block / 2 + fs * 0.4;
    x.font = `700 ${Math.round(fs * 2.6)}px Georgia, serif`; x.fillStyle = "rgba(255,255,255,.22)";
    x.fillText("“", W / 2, y0 - fs * 0.6);
    x.font = font(fs); x.fillStyle = "#FFFFFF";
    lines.forEach((l, i) => x.fillText(l, W / 2, y0 + fs + i * fs * 1.5));
    if (o.author.trim()) { x.font = `500 ${Math.round(fs * 0.55)}px "IBM Plex Sans Arabic", system-ui, sans-serif`; x.fillStyle = "rgba(255,255,255,.7)"; x.fillText(`— ${o.author.trim()}`, W / 2, y0 + fs + lines.length * fs * 1.5 + fs * 0.4); }
    x.direction = "ltr";
  }
}
