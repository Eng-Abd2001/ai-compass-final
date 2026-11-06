/** Lower-cases and folds Arabic spelling variants so "الأدوات" matches "الادوات", "ة" matches "ه", etc. Used by site search. */
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
