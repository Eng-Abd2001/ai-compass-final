"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { fmt } from "@/lib/convert/bytes";
import { HUB_TOOLS, orderFor, type Mode } from "@/lib/hub/registry";
import { readMode } from "@/lib/hub/store";
import { norm } from "@/lib/norm";

type Item = { id: string; group: "pages" | "hub" | "ai" | "actions"; label: string; hint?: string; href?: string; run?: () => void; icon: string };

export default function CommandPalette({ lang, ui, aiTools, open, onClose }: { lang: string; ui: Record<string, string>; aiTools: [string, string][]; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>("all");
  const base = `/${lang}`;
  const fire = (name: string) => () => window.dispatchEvent(new CustomEvent(name));

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = [
      { id: "home", group: "pages", label: ui.dkHome, href: "/", icon: "🏠" },
      { id: "academy", group: "pages", label: ui.dkAcademy, href: "/#academy", icon: "🎓" },
      { id: "tools", group: "pages", label: ui.dkToolsDir, href: `${base}/tools`, icon: "🧭" },
      { id: "convert", group: "pages", label: ui.cvNav, href: `${base}/convert`, icon: "🔄" },
      { id: "hub", group: "pages", label: ui.hbNav, href: `${base}/hub`, icon: "🧰" },
    ];
    const hub: Item[] = orderFor(mode).map((t) => ({ id: `hub-${t.id}`, group: "hub", label: ui[`hbT_${t.id}`], hint: ui[`hbD_${t.id}`], href: `${base}/hub#${t.id}`, icon: t.icon }));
    const ai: Item[] = aiTools.map(([id, n]) => ({ id: `ai-${id}`, group: "ai", label: n, href: `${base}/tools/${id}`, icon: "🤖" }));
    const acts: Item[] = [
      { id: "a-stash", group: "actions", label: ui.dkStash, run: fire("aic:stash-open"), icon: "📌" },
    ];
    return [...acts, ...pages, ...hub, ...ai];
  }, [ui, aiTools, base, mode]);

  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const list = tokens.length ? items.filter((i) => { const h = norm(`${i.label} ${i.hint ?? ""}`); return tokens.every((t) => h.includes(t)); }) : items.filter((i) => i.group !== "ai").slice(0, 16);
  const shown = list.slice(0, 30);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) { setQ(""); setActive(0); setMode(readMode()); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  const go = (it: Item) => {
    onClose();
    if (it.run) { it.run(); return; }
    if (!it.href) return;
    if (it.href === "/" || it.href.startsWith("/#")) { window.location.assign(it.href); return; }
    if (location.pathname === it.href.split("#")[0] && it.href.includes("#")) { location.hash = it.href.split("#")[1]; return; }
    router.push(it.href);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && shown[active]) { e.preventDefault(); go(shown[active]); }
  };
  useEffect(() => { document.getElementById(`pal-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  const groupName = (g: Item["group"]) => ({ pages: ui.dkPages, hub: ui.dkHub, ai: ui.dkAI, actions: ui.dkActions })[g];
  let lastGroup = "";
  return (
    <dialog ref={dlg} className="hb-pal" aria-label={ui.dkSearch} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hb-pal-in" onKeyDown={key}>
        <input type="search" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant={shown[active] ? `pal-${active}` : undefined} aria-label={ui.dkSearch} placeholder={ui.dkPh} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        <ul id="pal-list" role="listbox" className="hb-pal-list">
          {shown.map((it, i) => {
            const head = it.group !== lastGroup ? groupName(it.group) : null;
            lastGroup = it.group;
            return (
              <li key={it.id} role="presentation">
                {head && <p className="hb-pal-g">{head}</p>}
                <div id={`pal-${i}`} role="option" aria-selected={i === active} className={`hb-pal-i${i === active ? " on" : ""}`} onMouseMove={() => setActive(i)} onClick={() => go(it)}>
                  <span aria-hidden="true">{it.icon}</span><b>{it.label}</b>{it.hint && <small>{it.hint}</small>}
                </div>
              </li>
            );
          })}
          {!shown.length && <li className="hb-pal-none">{ui.dkNone}</li>}
        </ul>
        <p className="hb-pal-foot"><span>{ui.dkHint}</span>{mode !== "all" && <em>{fmt(ui.dkMode, ui[`hbM_${mode}`])}</em>}</p>
      </div>
    </dialog>
  );
}
