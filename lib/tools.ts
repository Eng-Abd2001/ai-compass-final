import raw from "@/data/tools.json";
import type { Lang } from "./i18n";

/** Generated from site/index.html by scripts/build-html.mjs (single source of truth). Pairs are [en, ar]. */
export type Tool = {
  id: string; n: string; c: [string, string]; u: string; g: string[];
  f: number | null; p: number; o: number; l: number; pu: string | null; pl: string[]; d2?: [string, string];
  pricing?: { currency: string; free: boolean; from: string; plans: string[][]; checked: string; source: string }; d: [string, string]; w: [string, string];
  status: string; last_verified: string | null; source_url: string;
};
export const TOOLS = raw as unknown as Tool[];
export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
export const pick = (pair: [string, string], l: Lang) => pair[l === "en" ? 0 : 1];

export function alternatives(t: Tool, n = 3): Tool[] {
  return TOOLS.filter((o) => o.id !== t.id)
    .map((o) => ({ o, k: o.g.filter((g) => t.g.includes(g)).length }))
    .filter((x) => x.k > 0)
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map((x) => x.o);
}
