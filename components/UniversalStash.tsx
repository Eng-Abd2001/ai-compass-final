"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fmt } from "@/lib/convert/bytes";
import { STASH_EVENT, readStash, stashClear, stashExport, stashRemove, type StashItem } from "@/lib/hub/store";
import { CopyBtn, download, textBlob } from "./hub/ui";

export function useStashItems(): StashItem[] {
  const [items, setItems] = useState<StashItem[]>([]);
  useEffect(() => {
    const f = () => setItems(readStash());
    f();
    window.addEventListener(STASH_EVENT, f);
    window.addEventListener("storage", f);
    return () => { window.removeEventListener(STASH_EVENT, f); window.removeEventListener("storage", f); };
  }, []);
  return items;
}

export default function UniversalStash({ lang, ui, open, onClose, ad, items }: { lang: string; ui: Record<string, string>; open: boolean; onClose: () => void; ad?: ReactNode; items: StashItem[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const locale = lang === "ar" ? "ar" : "en";
  return (
    <dialog ref={dlg} className="hb-drawer" aria-labelledby="st-t" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hb-drawer-in">
        <header className="hb-dh">
          <span className="hb-ic" aria-hidden="true">📌</span>
          <div><h2 id="st-t">{ui.stTitle}</h2><p>{fmt(ui.stItems, items.length)} · {ui.stSaved}</p></div>
          <button type="button" className="hb-close" onClick={onClose} aria-label={ui.hbClose}>✕</button>
        </header>
        <div className="hb-drawer-body">
          {items.length === 0 ? <p className="hb-hint">{ui.stEmpty}</p> : (
            <ul className="hb-stash">
              {items.map((it) => (
                <li key={it.id}>
                  <div className="hb-st-h"><b dir="auto">{it.title || "—"}</b><small>{fmt(ui.stFrom, it.source)} · {new Date(it.ts).toLocaleString(locale)}</small></div>
                  <pre dir="auto">{it.text}</pre>
                  <div className="hb-row"><CopyBtn text={it.text} ui={ui} label={ui.stCopy} /><button type="button" className="hb-btn ghost" onClick={() => stashRemove(it.id)}>{ui.stDelete}</button></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="hb-drawer-foot">
          <div className="hb-row">
            <button type="button" className="hb-btn primary" disabled={!items.length} onClick={() => download("ai-compass-stash.txt", textBlob(stashExport(items, "AI Compass", locale)))}>{ui.stExport}</button>
            <button type="button" className="hb-btn" disabled={!items.length} onClick={() => { if (window.confirm(ui.stConfirm)) stashClear(); }}>{ui.stClear}</button>
          </div>
          {ad}
        </footer>
      </div>
    </dialog>
  );
}
