import { toWestDigits } from "./text";

export type SnKind = "email" | "url" | "phone" | "hashtag" | "price";
const CUR = "USD|EUR|GBP|SAR|AED|EGP|KWD|QAR|BHD|OMR|JOD|CAD|AUD|CHF";
const CUR_AR = "ريال|ر\\.س|درهم|د\\.إ|دينار|د\\.ك|جنيه|ج\\.م|دولار|يورو|ليرة";
const SYM = "[$€£¥₹]";
const NUM = "\\d[\\d,.\\u066B\\u066C]*";

/** Finds the matching pieces in a long text. Arabic-Indic digits are understood; results keep the original characters. */
export function extract(text: string, kind: SnKind, unique = true): string[] {
  const w = toWestDigits(text); // same length as text, so indexes line up
  let re: RegExp, hits: string[] = [];
  const grab = (r: RegExp, f?: (m: RegExpExecArray) => string | null) => {
    for (const m of w.matchAll(r)) { const v = f ? f(m as RegExpExecArray) : m[0]; if (v) hits.push(text.slice(m.index ?? 0, (m.index ?? 0) + v.length)); }
  };
  switch (kind) {
    case "email": re = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/g; grab(re); break;
    case "url": re = /\b(?:https?:\/\/|www\.)[^\s<>"'\u00a0]+/gi; grab(re, (m) => m[0].replace(/[.,;:!?)\]}»"'،؛؟]+$/u, "")); break;
    case "hashtag": re = /#[\p{L}\p{N}_]+/gu; grab(re); break;
    case "phone":
      re = /(?<![\w.])\+?\d[\d\s().\-]{6,}\d(?![\w])/g;
      grab(re, (m) => { const d = m[0].replace(/\D/g, ""); return d.length >= 8 && d.length <= 15 ? m[0].trim() : null; });
      break;
    case "price":
      grab(new RegExp(`(?:${SYM}|\\b(?:${CUR}))\\s?${NUM}|${NUM}\\s?(?:${SYM}|\\b(?:${CUR})\\b|(?:${CUR_AR}))`, "giu"), (m) => m[0].replace(/[.,]+$/, ""));
      break;
  }
  hits = hits.map((h) => h.trim());
  return unique ? [...new Set(hits)] : hits;
}
