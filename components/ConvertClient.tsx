"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, KeyboardEvent } from "react";
import type { Lang } from "@/lib/i18n";
import { bytesOf, fmt, humanSize } from "@/lib/convert/bytes";
import { supportedEncoders, readMetadata, type ImgFmt, type Meta } from "@/lib/convert/image";
import { printDocument } from "@/lib/convert/office";
import { hasMeta, openPdf, renderPdfPage, type PagePlan, type PdfHandle, type PdfMeta } from "@/lib/convert/pdf";
import { GROUPS, KIND_NAME, SUPPORTED, routesFor, type Group, type Route } from "@/lib/convert/routes";
import { DEFAULT_OPTS, runRoute, type Failure, type Opts, type Out } from "@/lib/convert/run";
import { isImage, sniff, type Kind } from "@/lib/convert/sniff";
import { zipBlob } from "@/lib/convert/zip";

type Ui = Record<string, string>;
const MAX_FILES = 50;
const MAX_BYTES = 250 * 1024 * 1024;
const ERR_KEY: Record<string, string> = { "bad-zip": "xml", "not-a-zip": "xml", xml: "xml", docx: "xml", xlsx: "xml", "zip-method": "xml", encode: "generic" };
const rk = (id: string) => id.replace(/-/g, "_");

type Item = {
  id: string; file: File; kind: Kind; thumb?: string; err?: string;
  meta?: Meta | null; pdf?: { pages: number; meta: PdfMeta };
};
type Done = Out & { url: string };

/* ---------------- small pieces ---------------- */
function Compare({ before, after, ui }: { before: string; after: string; ui: Ui }) {
  const [v, setV] = useState(50);
  return (
    <figure className="cv-cmp" dir="ltr" style={{ "--p": `${v}%` } as CSSProperties}>
      <div className="cv-cmp-stage">
        <img src={after} alt={ui.cvAfter} />
        <img className="cv-cmp-b" src={before} alt={ui.cvBefore} />
        <span className="cv-cmp-line" aria-hidden="true" />
      </div>
      <input type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} aria-label={ui.cvCompare} />
      <figcaption><span>{ui.cvBefore}</span><span>{ui.cvAfter}</span></figcaption>
    </figure>
  );
}

function Thumb({ handle, page, rotate, alt }: { handle: PdfHandle; page: number; rotate: number; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dead = false;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      renderPdfPage(handle, page + 1, 0.35).then((c) => { if (!dead) setSrc(c.toDataURL("image/jpeg", 0.7)); }).catch(() => undefined);
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { dead = true; io.disconnect(); };
  }, [handle, page]);
  return (
    <div ref={ref} className="cv-thumb">
      {src ? <img src={src} alt={alt} style={{ transform: `rotate(${rotate}deg)` }} /> : null}
    </div>
  );
}

type Card = { page: number; rotate: number; keep: boolean };
function PageGrid({ handle, ui, onPlan }: { handle: PdfHandle; ui: Ui; onPlan: (p: PagePlan[]) => void }) {
  const [cards, setCards] = useState<Card[]>(() => Array.from({ length: handle.pages }, (_, i) => ({ page: i, rotate: 0, keep: true })));
  useEffect(() => { onPlan(cards.filter((c) => c.keep).map(({ page, rotate }) => ({ page, rotate }))); }, [cards, onPlan]);
  const kept = cards.filter((c) => c.keep).length;
  const upd = (i: number, f: (c: Card) => Card) => setCards((cs) => cs.map((c, k) => (k === i ? f(c) : c)));
  const move = (i: number, d: number) => setCards((cs) => {
    const j = i + d;
    if (j < 0 || j >= cs.length) return cs;
    const n = [...cs];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  return (
    <div className="cv-pages">
      <p className="cv-hint">{ui.cvO_orgHint} <b>{fmt(ui.cvO_keep, kept, cards.length)}</b></p>
      <ul className="cv-grid">
        {cards.map((c, i) => (
          <li key={c.page} className={c.keep ? "cv-pg" : "cv-pg is-off"}>
            <Thumb handle={handle} page={c.page} rotate={c.rotate} alt={fmt(ui.cvO_pageN, c.page + 1)} />
            <span className="cv-pgn">{c.page + 1}</span>
            <div className="cv-pgb">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={fmt(ui.cvO_moveL, c.page + 1)}>‹</button>
              <button type="button" onClick={() => upd(i, (x) => ({ ...x, rotate: (x.rotate + 90) % 360 }))} aria-label={fmt(ui.cvO_rot, c.page + 1)}>↻</button>
              <button type="button" onClick={() => upd(i, (x) => ({ ...x, keep: !x.keep }))} aria-label={fmt(c.keep ? ui.cvO_del : ui.cvO_restore, c.page + 1)}>{c.keep ? "✕" : "＋"}</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === cards.length - 1} aria-label={fmt(ui.cvO_moveR, c.page + 1)}>›</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- main workbench ---------------- */
export default function ConvertClient({ ui }: { lang?: Lang; ui: Ui }) {
  const [items, setItems] = useState<Item[]>([]);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [o, setO] = useState<Opts>(DEFAULT_OPTS);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [prog, setProg] = useState<[number, number]>([0, 0]);
  const [outs, setOuts] = useState<Done[]>([]);
  const [failed, setFailed] = useState<Failure[]>([]);
  const [msg, setMsg] = useState("");
  const [enc, setEnc] = useState<Record<ImgFmt, boolean> | null>(null);
  const [over, setOver] = useState(false);
  const cancel = useRef(false);
  const pdfs = useRef(new Map<string, PdfHandle>());
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const outsRef = useRef<Done[]>([]);
  outsRef.current = outs;

  useEffect(() => { supportedEncoders().then(setEnc).catch(() => undefined); }, []);
  useEffect(() => () => {
    itemsRef.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    outsRef.current.forEach((x) => URL.revokeObjectURL(x.url));
    pdfs.current.forEach((h) => h.destroy());
  }, []);

  const patch = useCallback((id: string, p: Partial<Item>) => setItems((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c))), []);

  const clearResults = useCallback(() => {
    outsRef.current.forEach((x) => URL.revokeObjectURL(x.url));
    setOuts([]); setFailed([]); setMsg(""); setPhase("idle");
  }, []);

  const add = useCallback(async (list: File[]) => {
    if (!list.length) return;
    clearResults();
    const room = MAX_FILES - itemsRef.current.length;
    if (list.length > room) setMsg(ui.cvE_count);
    for (const file of list.slice(0, Math.max(0, room))) {
      const id = `f${++counter.current}`;
      let kind: Kind = "unknown";
      try { kind = await sniff(file); } catch { /* keep unknown */ }
      const it: Item = { id, file, kind };
      if (file.size > MAX_BYTES) it.err = "big";
      else if (isImage(kind) && kind !== "heic") it.thumb = URL.createObjectURL(file);
      setItems((cs) => [...cs, it]);
      if (it.err) continue;
      if (kind === "jpeg" || kind === "png" || kind === "webp") readMetadata(file, kind).then((m) => patch(id, { meta: m })).catch(() => undefined);
      if (kind === "pdf") {
        bytesOf(file).then((b) => openPdf(b)).then((h) => { pdfs.current.set(id, h); patch(id, { pdf: { pages: h.pages, meta: h.meta } }); })
          .catch((e: Error) => patch(id, { err: e.message === "password" ? "password" : e.message === "lib" ? "lib" : "pdf" }));
      }
    }
  }, [clearResults, patch, ui.cvE_count]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) { e.preventDefault(); void add(files.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `pasted-${Date.now()}-${i}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type })))); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  const remove = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (it?.thumb) URL.revokeObjectURL(it.thumb);
    pdfs.current.get(id)?.destroy();
    pdfs.current.delete(id);
    setItems((cs) => cs.filter((c) => c.id !== id));
    clearResults();
  };
  const removeAll = () => { items.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb)); pdfs.current.forEach((h) => h.destroy()); pdfs.current.clear(); setItems([]); setRouteId(null); clearResults(); };
  const move = (i: number, d: number) => setItems((cs) => { const j = i + d; if (j < 0 || j >= cs.length) return cs; const n = [...cs]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const usable = useMemo(() => items.filter((i) => !i.err && SUPPORTED.has(i.kind)), [items]);
  const routes = useMemo(() => routesFor(usable.map((i) => i.kind)), [usable]);
  const route: Route | undefined = routes.find((r) => r.id === routeId);
  useEffect(() => { if (routeId && !routes.some((r) => r.id === routeId)) setRouteId(null); }, [routes, routeId]);

  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((p) => ({ ...p, [k]: v }));
  const toggleIco = (s: number, on: boolean) => {
    const next = on ? [...o.ico, s].sort((a, b) => a - b) : o.ico.filter((x) => x !== s);
    if (next.length) set("ico", next);
  };
  const onPlan = useCallback((plan: PagePlan[]) => setO((p) => ({ ...p, plan })), []);
  const pick = (id: string) => {
    setRouteId(id);
    clearResults();
    setO((p) => ({ ...p, targetKb: id === "pdf-compress" ? (p.targetKb === 200 ? 500 : p.targetKb) : p.targetKb === 500 ? 200 : p.targetKb }));
  };

  const errText = (c: string) => ui[`cvE_${ERR_KEY[c] ?? c}`] ?? ui.cvE_generic;
  const getPdf = useCallback(async (it: { id: string; file: File }) => {
    const hit = pdfs.current.get(it.id);
    if (hit) return hit;
    const h = await openPdf(await bytesOf(it.file));
    pdfs.current.set(it.id, h);
    return h;
  }, []);

  const run = async () => {
    if (!route || !usable.length || phase === "running") return;
    clearResults();
    setPhase("running");
    setProg([0, usable.length]);
    cancel.current = false;
    try {
      const encoders = await supportedEncoders();
      const res = await runRoute(route, usable.map(({ id, file, kind }) => ({ id, file, kind })), {
        opts: o, progress: (d, t) => setProg([d, t]), cancelled: () => cancel.current, getPdf, encoders,
      });
      if (res.print) { printDocument(res.print.html, res.print.rtl); setMsg(ui.cvPrintOpened); }
      setOuts(res.outs.map((x) => ({ ...x, url: URL.createObjectURL(x.blob) })));
      setFailed(res.failed);
    } catch (e) {
      setFailed([{ name: "", code: e instanceof Error ? e.message : "generic" }]);
    }
    setPhase("done");
  };

  const downloadAll = async () => {
    const files = [];
    for (const x of outs) files.push({ name: x.name, data: await bytesOf(x.blob) });
    const url = URL.createObjectURL(zipBlob(files));
    const a = document.createElement("a");
    a.href = url; a.download = "converted.zip"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const noteText = (x: Out): string => {
    if (!x.note) return "";
    const [t, a, b] = x.note.split("|");
    if (t === "pages") return fmt(ui.cvNoteParts, a);
    if (t === "empty") return ui.cvNoteEmpty;
    if (t === "ok" && !a) return ui.cvNoteOk;
    if (t === "miss") return ui.cvNoteMiss;
    if (t === "ok") return route?.id === "pdf-compress" ? fmt(ui.cvNotePdfFit, a, b) : fmt(ui.cvNoteFit, a, b);
    return "";
  };

  /* ---------- drag and drop ---------- */
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); void add(Array.from(e.dataTransfer.files)); };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { void add(Array.from(e.target.files ?? [])); e.target.value = ""; };
  const onZoneKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } };

  const kindLabel = (i: Item) => KIND_NAME[i.kind] ?? (i.kind === "txt" ? ui.cvKtxt : i.kind === "zip" ? ui.cvKzip : ui.cvKunknown);
  const unsupported = (i: Item) => !i.err && !SUPPORTED.has(i.kind);
  const lossy = route?.fmt === "jpeg" || route?.fmt === "webp" || route?.fmt === "avif";
  const showQuality = !!route && route.opts.includes("quality") && (route.id === "img-pdf" || route.fmt === "jpeg" || route.fmt === "webp" || route.fmt === "avif" || route.id.startsWith("pdf-"));
  const pdfItem = usable.length === 1 && usable[0].kind === "pdf" ? usable[0] : undefined;
  const pdfHandle = pdfItem ? pdfs.current.get(pdfItem.id) : undefined;
  const blockedFmt = (r: Route) => !!(r.fmt && enc && !enc[r.fmt]);
  const xray = items.filter((i) => (i.meta && !i.err) || (i.pdf && hasMeta(i.pdf.meta)));
  const compareBefore = items.find((i) => i.thumb && isImage(i.kind))?.thumb;
  const firstImg = outs.find((x) => x.image);
  const errLabel = (c: string) => errText(c);

  return (
    <div className="cv" aria-label={ui.cvWorkbench}>
      <div
        className={`cv-drop${over ? " is-over" : ""}${items.length ? " has-files" : ""}`}
        role="button" tabIndex={0} onKeyDown={onZoneKey} onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
      >
        <span className="cv-drop-ic" aria-hidden="true">⇪</span>
        <strong>{ui.cvDropT}</strong>
        <span>{ui.cvDropS}</span>
        <span className="cv-btn">{ui.cvChoose}</span>
        <input ref={inputRef} type="file" multiple hidden onChange={onPick} />
      </div>

      {msg && <p className="cv-msg" role="status">{msg}</p>}

      {items.length > 0 && (
        <section className="cv-sec" aria-labelledby="cv-files-h">
          <div className="cv-sec-h">
            <h2 id="cv-files-h">{ui.cvFiles} <small>{items.length}</small></h2>
            <button type="button" className="cv-link" onClick={removeAll}>{ui.cvClearAll}</button>
          </div>
          <ul className="cv-files">
            {items.map((it, i) => (
              <li key={it.id} className={it.err || unsupported(it) ? "cv-file is-bad" : "cv-file"}>
                <span className="cv-fth">{it.thumb ? <img src={it.thumb} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <b>{KIND_NAME[it.kind] ?? "?"}</b>}</span>
                <span className="cv-fi">
                  <span className="cv-fn" dir="auto">{it.file.name}</span>
                  <span className="cv-fm" title={fmt(ui.cvDetected, kindLabel(it))}>
                    {kindLabel(it)} · {humanSize(it.file.size)}{it.pdf ? ` · ${fmt(ui.cvPages, it.pdf.pages)}` : ""}
                    {it.err ? <em> · {it.err === "big" ? fmt(ui.cvTooBig, 250) : errLabel(it.err)}</em> : unsupported(it) ? <em> · {ui.cvUnsup}</em> : null}
                  </span>
                </span>
                <span className="cv-fa">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={ui.cvUp}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={ui.cvDown}>↓</button>
                  <button type="button" onClick={() => remove(it.id)} aria-label={fmt(ui.cvRemove, it.file.name)}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {xray.length > 0 && (
        <section className="cv-sec cv-xray" aria-labelledby="cv-xray-h">
          <h2 id="cv-xray-h">{ui.cvXray}</h2>
          {xray.map((it) => (
            <div key={it.id} className="cv-xray-it">
              <h3 dir="auto">{fmt(ui.cvXrayFound, it.file.name)}</h3>
              {it.meta?.gps && <p className="cv-warn">⚠ {ui.cvGpsWarn}</p>}
              <dl>
                {it.meta && ([["camera", it.meta.camera], ["lens", it.meta.lens], ["software", it.meta.software], ["date", it.meta.date], ["artist", it.meta.artist], ["copyright", it.meta.copyright], ["gps", it.meta.gps ? `${it.meta.gps.lat}, ${it.meta.gps.lon}` : undefined], ["other", it.meta.other ? ui.cvX_yes : undefined]] as [string, string | undefined][])
                  .filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt>{ui[`cvX_${k}`]}</dt><dd dir="auto">{v}</dd></div>))}
                {it.pdf && ([["title", it.pdf.meta.title], ["artist", it.pdf.meta.author], ["subject", it.pdf.meta.subject], ["keywords", it.pdf.meta.keywords], ["creator", it.pdf.meta.creator], ["producer", it.pdf.meta.producer], ["created", it.pdf.meta.created], ["modified", it.pdf.meta.modified], ["xmp", it.pdf.meta.xmp ? ui.cvX_yes : undefined]] as [string, string | undefined][])
                  .filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt>{ui[`cvX_${k}`]}</dt><dd dir="auto">{v}</dd></div>))}
              </dl>
              {route?.cleans && <p className="cv-ok">✓ {ui.cvXrayGone}</p>}
            </div>
          ))}
        </section>
      )}

      <section className="cv-sec" aria-labelledby="cv-where-h">
        <h2 id="cv-where-h">{ui.cvWhere}</h2>
        {!items.length ? <p className="cv-hint">{ui.cvNoFiles}</p>
          : !routes.length ? <p className="cv-hint cv-bad">{usable.length ? ui.cvNoRoute : ui.cvUnsup}</p>
          : (
            <>
              <p className="cv-hint">{ui.cvWhereHint}</p>
              {GROUPS.map((g: Group) => {
                const rs = routes.filter((r) => r.group === g);
                if (!rs.length) return null;
                return (
                  <div key={g} role="group" aria-label={ui[`cvG_${g}`]} className="cv-routes-g">
                    <h3>{ui[`cvG_${g}`]}</h3>
                    <div className="cv-routes">
                      {rs.map((r) => (
                        <button type="button" key={r.id} className="cv-route" aria-pressed={r.id === routeId} disabled={blockedFmt(r)} onClick={() => pick(r.id)}>
                          <b>{ui[`cvr_${rk(r.id)}`]}</b>
                          <small>{blockedFmt(r) ? ui.cvE_unsupported : ui[`cvd_${rk(r.id)}`]}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
      </section>

      {route && (
        <section className="cv-sec cv-opts" aria-labelledby="cv-opts-h">
          <h2 id="cv-opts-h">{ui.cvOpts}</h2>
          <div className="cv-opt-grid">
            {route.opts.includes("size") && (
              <label className="cv-f"><span>{ui.cvO_size}</span>
                <select value={o.maxSide} onChange={(e) => set("maxSide", +e.target.value)}>
                  {[0, 3840, 2560, 1920, 1280, 1024, 800, 512].map((v) => <option key={v} value={v}>{v ? `${v} px` : ui.cvO_orig}</option>)}
                </select>
              </label>
            )}
            {showQuality && (
              <label className="cv-f"><span>{ui.cvO_quality}: <b>{o.quality}%</b></span>
                <input type="range" min={30} max={100} value={o.quality} onChange={(e) => set("quality", +e.target.value)} disabled={o.target && route.id !== "pdf-jpeg" && route.id !== "pdf-webp" && lossy} />
              </label>
            )}
            {route.opts.includes("bg") && (
              <label className="cv-f"><span>{ui.cvO_bg}</span><input type="color" value={o.bg} onChange={(e) => set("bg", e.target.value)} /></label>
            )}
            {route.opts.includes("page") && (
              <>
                <label className="cv-f"><span>{ui.cvO_page}</span>
                  <select value={o.page} onChange={(e) => set("page", e.target.value as Opts["page"])}>
                    <option value="a4">{ui.cvO_a4}</option><option value="letter">{ui.cvO_letter}</option><option value="fit">{ui.cvO_fit}</option>
                  </select>
                </label>
                {o.page !== "fit" && (
                  <>
                    <label className="cv-f"><span>{ui.cvO_orient}</span>
                      <select value={o.orient} onChange={(e) => set("orient", e.target.value as Opts["orient"])}>
                        <option value="auto">{ui.cvO_auto}</option><option value="portrait">{ui.cvO_portrait}</option><option value="landscape">{ui.cvO_landscape}</option>
                      </select>
                    </label>
                    <label className="cv-f"><span>{ui.cvO_margin}</span>
                      <input type="number" min={0} max={40} value={o.margin} onChange={(e) => set("margin", Math.max(0, Math.min(40, +e.target.value || 0)))} />
                    </label>
                  </>
                )}
              </>
            )}
            {route.opts.includes("pages") && (
              <label className="cv-f cv-wide"><span>{ui.cvO_pages}</span>
                <input type="text" dir="ltr" value={o.pages} placeholder={ui.cvO_pagesPh} onChange={(e) => set("pages", e.target.value)} autoComplete="off" spellCheck={false} />
              </label>
            )}
            {route.opts.includes("dpi") && (
              <label className="cv-f"><span>{ui.cvO_dpi}</span>
                <select value={o.dpi} onChange={(e) => set("dpi", +e.target.value)}>
                  {[72, 96, 150, 200, 300].map((v) => <option key={v} value={v}>{fmt(ui.cvO_dpiV, v)}</option>)}
                </select>
              </label>
            )}
            {route.opts.includes("maxdpi") && (
              <label className="cv-f"><span>{ui.cvO_maxdpi}</span>
                <select value={o.maxdpi} onChange={(e) => set("maxdpi", +e.target.value)}>
                  {[72, 96, 110, 150, 200].map((v) => <option key={v} value={v}>{fmt(ui.cvO_dpiV, v)}</option>)}
                </select>
              </label>
            )}
            {route.opts.includes("marks") && (
              <label className="cv-f cv-chk"><input type="checkbox" checked={o.marks} onChange={(e) => set("marks", e.target.checked)} /><span>{ui.cvO_marks}</span></label>
            )}
            {route.opts.includes("target") && (
              <div className="cv-f cv-wide cv-target">
                {route.id === "pdf-compress" ? null : (
                  <label className="cv-chk"><input type="checkbox" checked={o.target} onChange={(e) => set("target", e.target.checked)} /><span>{ui.cvO_target}</span></label>
                )}
                {(o.target || route.id === "pdf-compress") && (
                  <>
                    <label className="cv-f"><span>{ui.cvO_targetKb}</span>
                      <input type="number" min={5} max={50000} value={o.targetKb} onChange={(e) => set("targetKb", Math.max(5, Math.min(50000, +e.target.value || 5)))} />
                    </label>
                    <p className="cv-hint">{ui.cvO_targetHint}</p>
                  </>
                )}
              </div>
            )}
            {route.opts.includes("split") && (
              <div className="cv-f cv-wide">
                <span>{ui.cvO_split}</span>
                <div className="cv-radios" role="radiogroup" aria-label={ui.cvO_split}>
                  {(["each", "every", "ranges"] as const).map((m) => (
                    <label key={m} className="cv-chk"><input type="radio" name="split" checked={o.split === m} onChange={() => set("split", m)} /><span>{ui[m === "each" ? "cvO_splitEach" : m === "every" ? "cvO_splitEvery" : "cvO_splitRanges"]}</span></label>
                  ))}
                </div>
                {o.split === "every" && <label className="cv-f"><span>{ui.cvO_every}</span><input type="number" min={1} max={999} value={o.every} onChange={(e) => set("every", Math.max(1, +e.target.value || 1))} /></label>}
                {o.split === "ranges" && <label className="cv-f"><span>{ui.cvO_splitRanges}</span><input type="text" dir="ltr" value={o.ranges} placeholder={ui.cvO_rangesPh} onChange={(e) => set("ranges", e.target.value)} autoComplete="off" spellCheck={false} /><small className="cv-hint">{ui.cvO_rangesHint}</small></label>}
              </div>
            )}
            {route.opts.includes("delim") && (
              <label className="cv-f"><span>{ui.cvO_delim}</span>
                <select value={o.delim} onChange={(e) => set("delim", e.target.value)}>
                  <option value=",">{ui.cvO_comma}</option><option value=";">{ui.cvO_semi}</option><option value={"\t"}>{ui.cvO_tab}</option><option value="|">{ui.cvO_pipe}</option>
                </select>
              </label>
            )}
            {route.opts.includes("bom") && <label className="cv-f cv-chk"><input type="checkbox" checked={o.bom} onChange={(e) => set("bom", e.target.checked)} /><span>{ui.cvO_bom}</span></label>}
            {route.opts.includes("sheets") && <label className="cv-f cv-chk"><input type="checkbox" checked={o.allSheets} onChange={(e) => set("allSheets", e.target.checked)} /><span>{ui.cvO_sheets}</span></label>}
            {route.opts.includes("header") && <label className="cv-f cv-chk"><input type="checkbox" checked={o.header} onChange={(e) => set("header", e.target.checked)} /><span>{ui.cvO_header}</span></label>}
            {route.opts.includes("ico") && (
              <fieldset className="cv-f cv-wide cv-ico"><legend>{ui.cvO_ico}</legend>
                {[16, 24, 32, 48, 64, 128, 256].map((s) => (
                  <label key={s} className="cv-chk"><input type="checkbox" checked={o.ico.includes(s)} onChange={(e) => toggleIco(s, e.target.checked)} /><span>{s}</span></label>
                ))}
              </fieldset>
            )}
          </div>
          {route.opts.includes("organize") && pdfItem && pdfHandle && <PageGrid key={pdfItem.id} handle={pdfHandle} ui={ui} onPlan={onPlan} />}
          {route.engine === "print" && <p className="cv-hint">{ui.cvO_print}</p>}
        </section>
      )}

      {route && (
        <div className="cv-run">
          <button type="button" className="cv-go" onClick={run} disabled={phase === "running" || !usable.length || (route.opts.includes("organize") && !pdfHandle)}>
            {phase === "running" ? fmt(ui.cvRunning, Math.min(prog[0] + 1, prog[1] || 1), prog[1]) : ui.cvRun}
          </button>
          {phase === "running" && <button type="button" className="cv-link" onClick={() => { cancel.current = true; }}>{ui.cvCancel}</button>}
          {phase === "running" && <progress max={Math.max(1, prog[1])} value={prog[0]} />}
        </div>
      )}

      <div aria-live="polite">
        {failed.length > 0 && (
          <ul className="cv-fails">
            {failed.map((f, i) => <li key={i}>{f.name ? fmt(ui.cvFailed, f.name, errLabel(f.code)) : errLabel(f.code)}</li>)}
          </ul>
        )}
        {phase === "done" && outs.length > 0 && (
          <section className="cv-sec cv-out" aria-labelledby="cv-out-h">
            <h2 id="cv-out-h">✓ {ui.cvDone}</h2>
            <ul className="cv-outs">
              {outs.map((x) => {
                const pct = x.from ? Math.round((1 - x.blob.size / x.from) * 100) : null;
                return (
                  <li key={x.name} className="cv-o">
                    <span className="cv-on" dir="auto">{x.name}</span>
                    <span className="cv-os">
                      {x.from ? `${humanSize(x.from)} → ` : ""}<b>{humanSize(x.blob.size)}</b>
                      {pct !== null && Math.abs(pct) >= 1 ? <em className={pct > 0 ? "good" : "warn"}> · {fmt(pct > 0 ? ui.cvSmaller : ui.cvBigger, Math.abs(pct))}</em> : null}
                    </span>
                    {noteText(x) && <span className="cv-on-note">{noteText(x)}</span>}
                    <a className="cv-dl" href={x.url} download={x.name}>{ui.cvDownload}</a>
                  </li>
                );
              })}
            </ul>
            {outs.length > 1 && <button type="button" className="cv-go cv-go2" onClick={downloadAll}>{ui.cvDownloadAll}</button>}
            {firstImg && compareBefore && route?.fmt && items.length >= 1 && <Compare before={compareBefore} after={firstImg.url} ui={ui} />}
            <button type="button" className="cv-link" onClick={removeAll}>{ui.cvAgain}</button>
          </section>
        )}
      </div>
    </div>
  );
}
