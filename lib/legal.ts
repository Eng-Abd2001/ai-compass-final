import raw from "@/data/pages.generated.json";

export type Pair = [string, string]; // [en, ar]
export type Section = { h: Pair; p: Pair[] };
export type LegalPage = { t: Pair; d: Pair; s: Section[]; email: boolean };

/** Generated from content/pages/*.txt by scripts/build-html.mjs (sections already filtered by the ads setting). */
const data = raw as unknown as { order: string[]; pages: Record<string, LegalPage> };
export const SLUGS: string[] = data.order;
export type Slug = string;
export const isSlug = (v: string): v is Slug => SLUGS.includes(v);
export const PAGES: Record<string, LegalPage> = data.pages;
