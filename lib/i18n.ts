import ui from "@/data/ui.generated.json";
import content from "@/data/content.generated.json";

export const LANGS = ["en", "ar"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);
export const dirOf = (l: Lang) => (l === "ar" ? "rtl" : "ltr");

/** Every visible text lives in content/ui/pages.txt (edit it there, not here). */
const P = (ui as unknown as { pages: Record<Lang, Record<string, unknown>> }).pages;
export const UI = P as unknown as Record<Lang, Record<string, string>>;
export const GOALS = { en: P.en.goals, ar: P.ar.goals } as unknown as Record<Lang, Record<string, string>>;
export const LEVELS = { en: P.en.levels, ar: P.ar.levels } as unknown as Record<Lang, string[]>;
/** From content/platforms.txt */
export const PLATFORMS = content.platforms as Record<Lang, Record<string, string>>;
