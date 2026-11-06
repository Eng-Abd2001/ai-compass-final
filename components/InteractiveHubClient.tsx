"use client";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fmt } from "@/lib/convert/bytes";
import { norm } from "@/lib/norm";
import { HUB_TOOLS, MODES, isToolId, type HubGroup, type HubTool, type Mode, type ToolId } from "@/lib/hub/registry";
import { MODE_EVENT, readMode, writeMode } from "@/lib/hub/store";
import type { HubUi } from "./hub/ui";
import type { Lang } from "@/lib/i18n";

/* Each group of tools is its own chunk: nothing is downloaded until a tool is opened (or about to be). */
const loaders = {
  text: () => import("./hub/TextTools"),
  studio: () => import("./hub/StudioTools"),
  life: () => import("./hub/LifeTools"),
  dev: () => import("./hub/DevTools"),
};
const Sanitizer = lazy(() => loaders.text().then((m) => ({ default: m.SanitizerTool })));
const Sniper = lazy(() => loaders.text().then((m) => ({ default: m.SniperTool })));
const Diff = lazy(() => loaders.text().then((m) => ({ default: m.DiffTool })));
const Exif = lazy(() => loaders.studio().then((m) => ({ default: m.ExifTool })));
const Qr = lazy(() => loaders.studio().then((m) => ({ default: m.QrTool })));
const Palette = lazy(() => loaders.studio().then((m) => ({ default: m.PaletteTool })));
const Mockup = lazy(() => loaders.studio().then((m) => ({ default: m.MockupTool })));
const Chat = lazy(() => loaders.life().then((m) => ({ default: m.ChatTool })));
const Calorie = lazy(() => loaders.life().then((m) => ({ default: m.CalorieTool })));
const Budget = lazy(() => loaders.life().then((m) => ({ default: m.BudgetTool })));
const Swiss = lazy(() => loaders.dev().then((m) => ({ default: m.SwissTool })));
const Decision = lazy(() => loaders.dev().then((m) => ({ default: m.DecisionTool })));

const GROUPS: HubGroup[] = ["text", "studio", "life", "dev"];
type Sec = { key: string; cls: string; title: string; tools: HubTool[]; badge: boolean };

function Card({ t, ui, badge, onOpen }: { t: HubTool; ui: HubUi; badge: boolean; onOpen: (id: ToolId) => void }) {
  const warm = () => { void loaders[t.group](); };
  return (
    <li className={`hb-card g-${t.group}`}>
      <button type="button" id={`hb-${t.id}`} onClick={() => onOpen(t.id)} onPointerEnter={warm} onFocus={warm} onTouchStart={warm} aria-haspopup="dialog">
        <span className="hb-ic" aria-hidden="true">{t.icon}</span>
        <span className="hb-ct">
          <strong>{ui[`hbT_${t.id}`]}</strong>
          <span className="hb-desc">{ui[`hbD_${t.id}`]}</span>
          {badge && <em className="hb-tag">{ui[`hbG_${t.group}`]}</em>}
        </span>
        <span className="hb-go" aria-hidden="true">→</span>
      </button>
    </li>
  );
}

export default function InteractiveHubClient({ lang, ui, sponsored, modalAd }: { lang: Lang; ui: HubUi; sponsored?: ReactNode; modalAd?: ReactNode }) {
  const [mode, setMode] = useState<Mode>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<ToolId | null>(null);
  const [preset, setPreset] = useState<string>();
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setMode(readMode());
    const f = () => setMode(readMode());
    window.addEventListener(MODE_EVENT, f);
    return () => window.removeEventListener(MODE_EVENT, f);
  }, []);

  const open = useCallback((id: ToolId, p?: string) => {
    setPreset(p); setOpenId(id);
    try { history.replaceState(null, "", `#${id}`); } catch { /* ignore */ }
  }, []);
  const close = useCallback(() => {
    setOpenId(null);
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fromHash = () => { const h = location.hash.slice(1); if (isToolId(h)) { setPreset(undefined); setOpenId(h); } };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (openId && !d.open) d.showModal();
    if (!openId && d.open) d.close();
    document.documentElement.classList.toggle("hb-lock", !!openId);
    return () => document.documentElement.classList.remove("hb-lock");
  }, [openId]);

  const tokens = norm(query).split(/\s+/).filter(Boolean);
  const hit = (t: HubTool) => !tokens.length || tokens.every((k) => norm(`${ui[`hbT_${t.id}`]} ${ui[`hbD_${t.id}`]}`).includes(k));
  const rec = mode !== "all" && !tokens.length ? HUB_TOOLS.filter((t) => t.tags.includes(mode)) : [];
  const secs: Sec[] = [];
  if (rec.length) secs.push({ key: "rec", cls: "g-rec", title: ui.hbRecommended, tools: rec, badge: true });
  for (const g of GROUPS) {
    const tools = HUB_TOOLS.filter((t) => t.group === g && hit(t) && !rec.includes(t));
    if (tools.length) secs.push({ key: g, cls: `g-${g}`, title: ui[`hbG_${g}`], tools, badge: false });
  }
  const shownCount = secs.reduce((n, s) => n + s.tools.length, 0);
  const sponsorAt = tokens.length ? -1 : Math.min(1, secs.length - 1);

  const tool = (id: ToolId): ReactNode => {
    switch (id) {
      case "sanitizer": return <Sanitizer ui={ui} />;
      case "sniper": return <Sniper ui={ui} />;
      case "diff": return <Diff ui={ui} />;
      case "exif": return <Exif ui={ui} />;
      case "qr": return <Qr ui={ui} preset={preset} />;
      case "palette": return <Palette ui={ui} />;
      case "mockup": return <Mockup ui={ui} />;
      case "chat": return <Chat ui={ui} lang={lang} onOpenTool={(_id, p) => open("qr", p)} />;
      case "calorie": return <Calorie ui={ui} />;
      case "budget": return <Budget ui={ui} />;
      case "swiss": return <Swiss ui={ui} />;
      case "decision": return <Decision ui={ui} />;
    }
  };
  const cur = openId ? HUB_TOOLS.find((t) => t.id === openId) : undefined;

  return (
    <div className="hb">
      <div className="hb-toolbar">
        <label className="hb-search">
          <span className="hb-sr">{ui.hbSearch}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ui.hbSearchPh} autoComplete="off" spellCheck={false} enterKeyHint="search" />
        </label>
        <div className="hb-modes" role="group" aria-label={ui.hbFilter}>
          {MODES.map((m) => <button type="button" key={m} aria-pressed={m === mode} onClick={() => writeMode(m)}>{ui[`hbM_${m}`]}</button>)}
        </div>
      </div>
      <p className="hb-hint" role="status">{tokens.length ? fmt(ui.hbResults, shownCount) : ui.hbModeHint}</p>

      {secs.map((s, i) => (
        <section key={s.key} className={`hb-sec ${s.cls}`} aria-labelledby={`hb-h-${s.key}`}>
          <header className="hb-sh"><h2 id={`hb-h-${s.key}`}><i aria-hidden="true" />{s.title}</h2><small>{fmt(ui.hbCount, s.tools.length)}</small></header>
          <ul className="hb-grid">
            {s.tools.map((t) => <Card key={t.id} t={t} ui={ui} badge={s.badge} onOpen={open} />)}
            {sponsored && i === sponsorAt && <li className="hb-card hb-sponsor"><div>{sponsored}</div></li>}
          </ul>
        </section>
      ))}
      {!secs.length && <p className="hb-empty">{ui.hbNoMatch}</p>}

      <dialog ref={dlg} className="hb-dialog" aria-labelledby="hb-dt" onClose={() => { if (openId) close(); }} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {cur && (
          <div className={`hb-dialog-in g-${cur.group}`}>
            <header className="hb-dh">
              <span className="hb-ic" aria-hidden="true">{cur.icon}</span>
              <div><h2 id="hb-dt">{ui[`hbT_${cur.id}`]}</h2><p>{ui[`hbD_${cur.id}`]}</p></div>
              <button type="button" className="hb-close" onClick={close} aria-label={ui.hbClose}>✕</button>
            </header>
            <div className="hb-db" key={cur.id}><Suspense fallback={<div className="hb-skel" role="status">{ui.hbLoading}</div>}>{tool(cur.id)}</Suspense></div>
            <footer className="hb-dfoot">{modalAd}</footer>
          </div>
        )}
      </dialog>
    </div>
  );
}
