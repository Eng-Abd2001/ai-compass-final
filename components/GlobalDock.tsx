"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import CommandPalette from "./CommandPalette";
import UniversalStash, { useStashItems } from "./UniversalStash";

/** Two round buttons floating over every page: site search (Ctrl+K) and the stash drawer. */
export default function GlobalDock({ lang, ui, aiTools, stashAd }: { lang: string; ui: Record<string, string>; aiTools: [string, string][]; stashAd?: ReactNode }) {
  const [pal, setPal] = useState(false);
  const [stash, setStash] = useState(false);
  const items = useStashItems();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal((v) => !v); } };
    const s = () => setStash(true);
    window.addEventListener("keydown", k);
    window.addEventListener("aic:stash-open", s);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("aic:stash-open", s); };
  }, []);
  return (
    <div className="hb-dock" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="hb-fab">
        <button type="button" onClick={() => setPal(true)} aria-label={ui.dkPalette} title={ui.dkPalette}>🔎</button>
        <button type="button" onClick={() => setStash(true)} aria-label={ui.stOpen} title={ui.stOpen}>📌{items.length > 0 && <i>{items.length > 99 ? "99+" : items.length}</i>}</button>
      </div>
      {pal && <CommandPalette lang={lang} ui={ui} aiTools={aiTools} open={pal} onClose={() => setPal(false)} />}
      <UniversalStash lang={lang} ui={ui} open={stash} onClose={() => setStash(false)} ad={stashAd} items={items} />
    </div>
  );
}
