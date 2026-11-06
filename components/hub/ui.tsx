"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { stashAdd } from "@/lib/hub/store";

export type HubUi = Record<string, string>;
export const unesc = (s: string): string => s.replace(/\\n/g, "\n");

export function useFlash(ms = 1600): readonly [boolean, () => void] {
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return [on, () => { setOn(true); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), ms); }] as const;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

export function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const textBlob = (s: string, type = "text/plain"): Blob => new Blob([s], { type: `${type};charset=utf-8` });

export function CopyBtn({ text, ui, label, disabled }: { text: string; ui: HubUi; label?: string; disabled?: boolean }) {
  const [done, flash] = useFlash();
  return <button type="button" className={`hb-btn${done ? " is-ok" : ""}`} disabled={disabled || !text} onClick={async () => { if (await copyText(text)) flash(); }}>{done ? ui.hbCopied : label ?? ui.hbCopy}</button>;
}

export function PinBtn({ text, title, source, ui, disabled }: { text: string; title: string; source: string; ui: HubUi; disabled?: boolean }) {
  const [done, flash] = useFlash();
  return <button type="button" className={`hb-btn ghost${done ? " is-ok" : ""}`} disabled={disabled || !text} onClick={() => { if (stashAdd({ title, text, source })) flash(); }}>{done ? ui.hbPinned : `📌 ${ui.hbPin}`}</button>;
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="hb-seg" role="group" aria-label={label}>
      {options.map((o) => <button type="button" key={o.v} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.t}</button>)}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="hb-chk"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`hb-f${wide ? " wide" : ""}`}><span>{label}</span>{children}</label>;
}

/** A hidden file input wrapped in a big friendly button. */
export function FilePick({ label, accept, onFile }: { label: string; accept: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="hb-btn primary" onClick={() => ref.current?.click()}>📁 {label}</button>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </>
  );
}
