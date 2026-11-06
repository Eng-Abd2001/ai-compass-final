import { jsonToRows, toCsv } from "../convert/office";

export type JsonResult = { ok: true; out: string } | { ok: false; msg: string; line?: number; col?: number };

export function jsonFormat(text: string, indent: number | "min", sortKeys = false): JsonResult {
  try {
    let v: unknown = JSON.parse(text);
    if (sortKeys) v = sortDeep(v);
    return { ok: true, out: indent === "min" ? JSON.stringify(v) : JSON.stringify(v, null, indent) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON";
    const bad = jsonErrorIndex(text);
    if (bad >= 0) {
      const before = text.slice(0, bad).split("\n");
      return { ok: false, msg, line: before.length, col: before[before.length - 1].length + 1 };
    }
    const lc = /line (\d+) column (\d+)/.exec(msg);
    if (lc) return { ok: false, msg, line: +lc[1], col: +lc[2] };
    const pos = /position (\d+)/.exec(msg);
    if (pos) {
      const before = text.slice(0, +pos[1]).split("\n");
      return { ok: false, msg, line: before.length, col: before[before.length - 1].length + 1 };
    }
    return { ok: false, msg };
  }
}
/** Index of the first character that makes the text invalid JSON, or -1. Small strict parser, used only to point at the error. */
export function jsonErrorIndex(t: string): number {
  let i = 0;
  const ws = () => { while (i < t.length && " \t\n\r".includes(t[i])) i++; };
  const fail = (): never => { throw i; };
  const str = () => {
    i++;
    while (i < t.length && t[i] !== '"') { if (t[i] === "\\") i++; else if (t[i] < " ") fail(); i++; }
    if (i >= t.length) fail();
    i++;
  };
  const val = (): void => {
    ws();
    const c = t[i];
    if (c === "{") {
      i++; ws();
      if (t[i] === "}") { i++; return; }
      for (;;) { ws(); if (t[i] !== '"') fail(); str(); ws(); if (t[i] !== ":") fail(); i++; val(); ws(); if (t[i] === ",") { i++; continue; } if (t[i] === "}") { i++; return; } fail(); }
    } else if (c === "[") {
      i++; ws();
      if (t[i] === "]") { i++; return; }
      for (;;) { val(); ws(); if (t[i] === ",") { i++; continue; } if (t[i] === "]") { i++; return; } fail(); }
    } else if (c === '"') str();
    else {
      const m = /^(-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i));
      if (!m) fail();
      i += (m as RegExpExecArray)[0].length;
    }
  };
  try { val(); ws(); if (i < t.length) fail(); return -1; } catch (e) { return typeof e === "number" ? Math.min(e, t.length) : -1; }
}
function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]));
  return v;
}
export function jsonToCsv(text: string, delim = ","): string { return toCsv(jsonToRows(text), delim, false); }

export function b64encode(s: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const out = btoa(bin);
  return urlSafe ? out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : out;
}
export function b64decode(s: string): string {
  let t = s.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
export const urlEncode = (s: string): string => encodeURIComponent(s);
export const urlDecode = (s: string): string => decodeURIComponent(s.replace(/\+/g, " "));

export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type PwOpts = { len: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; noAmbiguous: boolean };
const SETS = { lower: "abcdefghijklmnopqrstuvwxyz", upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits: "0123456789", symbols: "!@#$%^&*()-_=+[]{};:,.?/~" };
/** Uniformly random characters (rejection sampling, no modulo bias) with at least one from each chosen set. */
export function password(o: PwOpts): { text: string; bits: number } {
  const amb = /[Il1O0o|]/g;
  const sets = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((k) => o[k]).map((k) => (o.noAmbiguous ? SETS[k].replace(amb, "") : SETS[k]));
  if (!sets.length) return { text: "", bits: 0 };
  const pool = sets.join("");
  const rnd = (n: number): number => {
    const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
    do crypto.getRandomValues(a); while (a[0] >= lim);
    return a[0] % n;
  };
  const len = Math.max(o.len, sets.length);
  const chars = sets.map((s) => s[rnd(s.length)]);
  while (chars.length < len) chars.push(pool[rnd(pool.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return { text: chars.join(""), bits: Math.round(len * Math.log2(pool.length)) };
}
export const strength = (bits: number): 0 | 1 | 2 | 3 => (bits < 40 ? 0 : bits < 60 ? 1 : bits < 90 ? 2 : 3);

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
