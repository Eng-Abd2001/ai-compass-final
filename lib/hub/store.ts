/** Small localStorage-backed stores shared by the floating dock and the hub page. Safe when storage is blocked. */
import type { Mode } from "./registry";

export type StashItem = { id: string; title: string; text: string; source: string; ts: number };
const STASH = "aic.stash.v1", MODE = "aic.mode.v1";
export const STASH_EVENT = "aic:stash", MODE_EVENT = "aic:mode";

const valid = (x: unknown): x is StashItem => !!x && typeof x === "object" && typeof (x as StashItem).id === "string" && typeof (x as StashItem).text === "string";

export function readStash(): StashItem[] {
  try { const v: unknown = JSON.parse(localStorage.getItem(STASH) ?? "[]"); return Array.isArray(v) ? v.filter(valid) : []; } catch { return []; }
}
const write = (list: StashItem[]): boolean => {
  try { localStorage.setItem(STASH, JSON.stringify(list.slice(0, 200))); window.dispatchEvent(new CustomEvent(STASH_EVENT)); return true; } catch { return false; }
};
export function stashAdd(it: { title: string; text: string; source: string }): boolean {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return write([{ id, title: it.title.slice(0, 120), text: it.text.slice(0, 20000), source: it.source.slice(0, 80), ts: Date.now() }, ...readStash()]);
}
export const stashRemove = (id: string): boolean => write(readStash().filter((x) => x.id !== id));
export const stashClear = (): boolean => write([]);

export function stashExport(items: StashItem[], siteName: string, locale: string): string {
  const head = `${siteName} — stash (${new Date().toLocaleString(locale)})\n${"=".repeat(48)}\n`;
  return head + items.map((x) => `\n## ${x.title}\n${x.source} · ${new Date(x.ts).toLocaleString(locale)}\n\n${x.text}\n\n${"-".repeat(48)}`).join("\n") + "\n";
}

export function readMode(): Mode {
  try { const v = localStorage.getItem(MODE); return v === "dev" || v === "creator" || v === "daily" ? v : "all"; } catch { return "all"; }
}
export function writeMode(m: Mode): void {
  try { localStorage.setItem(MODE, m); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(MODE_EVENT));
}
