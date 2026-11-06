/** Text tools: Arabic/Latin cleanup, digits, counts, speaking time. Pure functions. */
export type Digits = "keep" | "west" | "arabic";
export type SanOpts = { tashkeel: boolean; hamza: boolean; yaa: boolean; taa: boolean; tatweel: boolean; digits: Digits; spaces: boolean; dupLines: boolean };
export const SAN_DEFAULTS: SanOpts = { tashkeel: true, hamza: true, yaa: false, taa: false, tatweel: true, digits: "keep", spaces: true, dupLines: false };

const IND = "٠١٢٣٤٥٦٧٨٩", PER = "۰۱۲۳۴۵۶۷۸۹";
export const toWestDigits = (s: string): string => s.replace(/[٠-٩۰-۹]/g, (d) => String(IND.includes(d) ? IND.indexOf(d) : PER.indexOf(d)));
export const toArabicDigits = (s: string): string => s.replace(/[0-9]/g, (d) => IND[+d]);

export function sanitize(t: string, o: SanOpts): string {
  let s = t.replace(/\r\n?/g, "\n");
  if (o.tashkeel) s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  if (o.tatweel) s = s.replace(/\u0640/g, "");
  if (o.hamza) s = s.replace(/[أإآٱ]/g, "ا");
  if (o.yaa) s = s.replace(/ى/g, "ي");
  if (o.taa) s = s.replace(/ة/g, "ه");
  if (o.digits === "west") s = toWestDigits(s);
  else if (o.digits === "arabic") s = toArabicDigits(toWestDigits(s));
  if (o.spaces) s = s.split("\n").map((l) => l.replace(/[ \t\u00A0\u200B]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (o.dupLines) {
    const seen = new Set<string>();
    s = s.split("\n").filter((l) => { const k = l.trim(); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join("\n");
  }
  return s;
}

export type TextStats = { chars: number; charsNoSpace: number; words: number; lines: number; sentences: number };
export function stats(t: string): TextStats {
  const words = (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) ?? []).length;
  return {
    chars: [...t].length, charsNoSpace: [...t.replace(/\s/g, "")].length, words,
    lines: t ? t.split(/\r?\n/).length : 0, sentences: (t.match(/[^.!?؟…]+[.!?؟…]+|[^.!?؟…]+$/g) ?? []).filter((x) => x.trim()).length,
  };
}
/** Speaking time in seconds. 130 wpm is a calm voice-over pace; 160 is energetic. */
export const speechSeconds = (words: number, wpm = 130): number => Math.round((words / wpm) * 60);
export const fmtDuration = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
export const VIDEO_LIMITS = [15, 30, 60, 90] as const;
