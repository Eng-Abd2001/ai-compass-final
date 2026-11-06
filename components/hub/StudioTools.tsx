"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { fmt, humanSize, baseName } from "@/lib/convert/bytes";
import { encodeCanvas, fitSize, loadImage, readMetadata, render, supportedEncoders, type ImgFmt, type Meta } from "@/lib/convert/image";
import { sniff } from "@/lib/convert/sniff";
import { THEMES, RATIO_PX, drawMockup, type MockOpts, type Ratio, type ThemeId } from "@/lib/hub/mockup";
import { contrast, cssVars, extractPalette, gradientCss, lum, textOn } from "@/lib/hub/palette";
import { encodeQr, qrCanvas, qrSvg, vcardString, wifiString, type Ecl, type QrCode, type WifiEnc } from "@/lib/hub/qr";
import { Check, CopyBtn, Field, FilePick, PinBtn, Seg, copyText, download, textBlob, unesc, useFlash, type HubUi } from "./ui";

/* ---------------- photo privacy scrubber ---------------- */
export function ExifTool({ ui }: { ui: HubUi }) {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta | null | undefined>(undefined);
  const [thumb, setThumb] = useState<string>();
  const [res, setRes] = useState<{ name: string; blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb); }, [thumb]);
  useEffect(() => () => { if (res) URL.revokeObjectURL(res.url); }, [res]);
  const pick = async (f: File) => {
    setErr(false); setRes(null); setMeta(undefined); setFile(f);
    setThumb(URL.createObjectURL(f));
    try { const k = await sniff(f); setMeta(await readMetadata(f, k)); } catch { setMeta(null); }
  };
  const clean = async () => {
    if (!file) return;
    setBusy(true); setErr(false);
    try {
      const kind = await sniff(file), L = await loadImage(file, kind);
      const fmt2: ImgFmt = kind === "jpeg" ? "jpeg" : kind === "webp" && (await supportedEncoders()).webp ? "webp" : "png";
      const { w, h } = fitSize(L.width, L.height, 0);
      const blob = await encodeCanvas(render(L, w, h, fmt2 === "jpeg" ? "#ffffff" : null), fmt2, 0.92);
      L.close();
      setRes({ name: `${baseName(file.name)}-clean.${fmt2 === "jpeg" ? "jpg" : fmt2}`, blob, url: URL.createObjectURL(blob) });
    } catch { setErr(true); }
    setBusy(false);
  };
  const rows: [string, string | undefined][] = meta ? [["camera", meta.camera], ["lens", meta.lens], ["software", meta.software], ["date", meta.date], ["artist", meta.artist], ["copyright", meta.copyright], ["gps", meta.gps ? `${meta.gps.lat}, ${meta.gps.lon}` : undefined], ["other", meta.other ? ui.cvX_yes : undefined]] : [];
  return (
    <div className="hb-tool">
      <div className="hb-row"><FilePick label={ui.hbE_pick} accept="image/*" onFile={pick} /></div>
      {file && (
        <div className="hb-exif">
          {thumb && <img src={thumb} alt="" className="hb-thumb" />}
          <div className="hb-grow">
            <p className="hb-fn" dir="auto">{file.name} · {humanSize(file.size)}</p>
            {meta === undefined ? null : meta ? (
              <>
                <h3>{ui.hbE_found}</h3>
                {meta.gps && <p className="hb-warn">⚠ {ui.hbE_warn}</p>}
                <dl className="hb-kv">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{ui[`cvX_${k}`]}</dt><dd dir="auto">{v}</dd></div>)}</dl>
              </>
            ) : <p className="hb-hint">{ui.hbE_none}</p>}
          </div>
        </div>
      )}
      {file && <div className="hb-row"><button type="button" className="hb-btn primary" onClick={clean} disabled={busy}>{ui.hbE_clean}</button></div>}
      {err && <p className="hb-hint bad" role="alert">{ui.hbE_bad}</p>}
      {res && file && (
        <div className="hb-resbox" role="status">
          <p>✓ {fmt(ui.hbE_done, humanSize(file.size), humanSize(res.blob.size))}</p>
          <a className="hb-btn primary" href={res.url} download={res.name}>{ui.hbDownload}</a>
        </div>
      )}
      <p className="hb-hint">{ui.hbE_note}</p>
    </div>
  );
}

/* ---------------- QR & Wi-Fi studio ---------------- */
type QrType = "url" | "wifi" | "vcard";
export function QrTool({ ui, preset }: { ui: HubUi; preset?: string }) {
  const [type, setType] = useState<QrType>("url");
  const [text, setText] = useState(preset ?? "");
  const [wifi, setWifi] = useState({ ssid: "", pass: "", enc: "WPA" as WifiEnc, hidden: false });
  const [vc, setVc] = useState({ first: "", last: "", org: "", title: "", phone: "", email: "", url: "" });
  const [fg, setFg] = useState("#0B0D12"), [bg, setBg] = useState("#FFFFFF");
  const [ecl, setEcl] = useState<Ecl>("M");
  const [px, setPx] = useState(1024);
  useEffect(() => { if (preset) { setType("url"); setText(preset); } }, [preset]);
  const rawPayload = type === "url" ? text : type === "wifi" ? (wifi.ssid ? wifiString(wifi.ssid, wifi.pass, wifi.enc, wifi.hidden) : "") : (vc.first || vc.last || vc.phone || vc.email ? vcardString(vc) : "");
  const payload = useDeferredValue(rawPayload);
  const qr = useMemo<QrCode | "long" | null>(() => { if (!payload) return null; try { return encodeQr(payload, ecl); } catch { return "long"; } }, [payload, ecl]);
  const ok = qr && qr !== "long" ? qr : null;
  const svg = ok ? qrSvg(ok, { fg, bg, border: 4 }) : "";
  const lowContrast = contrast(fg, bg) < 3 || lum(fg) > lum(bg);
  const png = () => { if (!ok) return; const mods = ok.size + 8; qrCanvas(ok, { fg, bg, border: 4, px: Math.max(2, Math.round(px / mods)) }).toBlob((b) => b && download("qr.png", b), "image/png"); };
  const v = (k: keyof typeof vc) => (e: { target: { value: string } }) => setVc((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="hb-tool">
      <Seg label={ui.hbQ_type} value={type} onChange={setType} options={[{ v: "url", t: ui.hbQ_text }, { v: "wifi", t: ui.hbQ_wifi }, { v: "vcard", t: ui.hbQ_vcard }]} />
      {type === "url" && <Field label={ui.hbQ_text} wide><textarea dir="auto" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="https://" spellCheck={false} /></Field>}
      {type === "wifi" && (
        <div className="hb-grid2">
          <Field label={ui.hbQ_ssid}><input type="text" dir="auto" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} autoComplete="off" /></Field>
          <Field label={ui.hbQ_pass}><input type="text" dir="ltr" value={wifi.pass} onChange={(e) => setWifi({ ...wifi, pass: e.target.value })} disabled={wifi.enc === "nopass"} autoComplete="off" /></Field>
          <Field label={ui.hbQ_enc}><select value={wifi.enc} onChange={(e) => setWifi({ ...wifi, enc: e.target.value as WifiEnc })}><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">{ui.hbQ_open}</option></select></Field>
          <Check label={ui.hbQ_hidden} checked={wifi.hidden} onChange={(h) => setWifi({ ...wifi, hidden: h })} />
        </div>
      )}
      {type === "vcard" && (
        <div className="hb-grid2">
          {(["first", "last", "org", "title", "phone", "email", "url"] as const).map((k) => (
            <Field key={k} label={ui[`hbQ_${k === "url" ? "web" : k}`]}><input type={k === "email" ? "email" : "text"} dir={k === "first" || k === "last" || k === "org" || k === "title" ? "auto" : "ltr"} value={vc[k]} onChange={v(k)} autoComplete="off" /></Field>
          ))}
        </div>
      )}
      <div className="hb-grid2">
        <Field label={ui.hbQ_fg}><input type="color" value={fg} onChange={(e) => setFg(e.target.value.toUpperCase())} /></Field>
        <Field label={ui.hbQ_bg}><input type="color" value={bg} onChange={(e) => setBg(e.target.value.toUpperCase())} /></Field>
        <Field label={ui.hbQ_ecl}><select value={ecl} onChange={(e) => setEcl(e.target.value as Ecl)}>{(["L", "M", "Q", "H"] as Ecl[]).map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
        <Field label={ui.hbQ_size}><select value={px} onChange={(e) => setPx(+e.target.value)}>{[512, 1024, 2048].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
      </div>
      <p className="hb-hint">{ui.hbQ_eclHint}</p>
      <div className="hb-qr" aria-live="polite">
        {ok ? <div className="hb-qr-img" role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="hb-hint">{qr === "long" ? ui.hbQ_long : ui.hbQ_empty}</p>}
      </div>
      {ok && lowContrast && <p className="hb-warn">⚠ {ui.hbQ_low}</p>}
      <div className="hb-row">
        <button type="button" className="hb-btn primary" disabled={!ok} onClick={png}>{ui.hbQ_png}</button>
        <button type="button" className="hb-btn" disabled={!ok} onClick={() => download("qr.svg", textBlob(svg, "image/svg+xml"))}>{ui.hbQ_svg}</button>
        <PinBtn text={payload} title={payload.slice(0, 48)} source={ui.hbT_qr} ui={ui} disabled={!ok} />
      </div>
      <p className="hb-hint">{ui.hbQ_test}</p>
    </div>
  );
}

/* ---------------- palette & gradient lab ---------------- */
export function PaletteTool({ ui }: { ui: HubUi }) {
  const [cols, setCols] = useState<string[]>([]);
  const [angle, setAngle] = useState(135);
  const [url, setUrl] = useState<string>();
  const [bad, setBad] = useState(false);
  const [copied, flash] = useFlash();
  const [last, setLast] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const pick = async (f: File) => {
    setBad(false);
    try {
      const L = await loadImage(f, await sniff(f));
      const { w, h } = fitSize(L.width, L.height, 220);
      const cv = render(L, w, h, null);
      L.close();
      const c = extractPalette(cv.getContext("2d")!.getImageData(0, 0, cv.width, cv.height).data, 6);
      if (!c.length) throw new Error("empty");
      setCols(c); setUrl(URL.createObjectURL(f));
    } catch { setBad(true); }
  };
  const grad = cols.length ? gradientCss(cols.slice(0, 3).length > 1 ? cols.slice(0, 3) : [cols[0], cols[0]], angle) : "";
  const css = grad ? `background: ${grad};` : "";
  const vars = cols.length ? cssVars(cols) : "";
  const on = cols[0] ? textOn(cols[0]) : "#fff";
  return (
    <div className="hb-tool">
      <div className="hb-row"><FilePick label={ui.hbP_pick} accept="image/*" onFile={pick} /></div>
      {bad && <p className="hb-hint bad" role="alert">{ui.hbE_bad}</p>}
      {cols.length > 0 && (
        <>
          <div className="hb-pal-top">{url && <img src={url} alt="" className="hb-thumb" />}
            <div className="hb-sw" role="list" aria-label={ui.hbP_colors}>
              {cols.map((c) => <button type="button" role="listitem" key={c} className="hb-swatch" style={{ background: c, color: textOn(c) }} onClick={async () => { if (await copyText(c)) { setLast(c); flash(); } }} aria-label={fmt(ui.hbP_copy, c)}>{copied && last === c ? ui.hbCopied : c}</button>)}
            </div>
          </div>
          <label className="hb-f"><span>{ui.hbP_angle}: <b>{angle}°</b></span><input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(+e.target.value)} /></label>
          <div className="hb-f wide"><span>{ui.hbP_card}</span>
            <div className="hb-pcard" style={{ background: grad, color: on }}>
              <strong>{ui.hbP_cardTitle}</strong><p>{ui.hbP_cardText}</p>
              <span className="hb-pbtn" style={{ background: on, color: cols[0] }}>{ui.hbP_btn}</span>
            </div>
          </div>
          <div className="hb-f wide"><span>{ui.hbP_css}</span><code className="hb-code" dir="ltr">{css}</code></div>
          <div className="hb-f wide"><span>{ui.hbP_vars}</span><code className="hb-code" dir="ltr">{vars}</code></div>
          <div className="hb-row"><CopyBtn text={css} ui={ui} label={ui.hbP_css} /><CopyBtn text={vars} ui={ui} label={ui.hbP_vars} /><PinBtn text={`${cols.join(", ")}\n${css}\n${vars}`} title={cols.join(" ")} source={ui.hbT_palette} ui={ui} /></div>
        </>
      )}
    </div>
  );
}

/* ---------------- code & quote beautifier ---------------- */
export function MockupTool({ ui }: { ui: HubUi }) {
  const [o, setO] = useState<MockOpts>({ mode: "code", text: unesc(ui.hbK_sampleCode), title: "greet.js", author: "", theme: "aurora", ratio: "16:9", lineNumbers: true, size: 40 });
  const cv = useRef<HTMLCanvasElement>(null);
  const od = useDeferredValue(o);
  useEffect(() => { if (cv.current) drawMockup(cv.current, od, 0.34); }, [od]);
  const save = () => { const big = document.createElement("canvas"); drawMockup(big, o, 1); big.toBlob((b) => b && download(`${o.mode}-${o.ratio.replace(":", "x")}.png`, b), "image/png"); };
  const set = <K extends keyof MockOpts>(k: K, v: MockOpts[K]) => setO((p) => ({ ...p, [k]: v }));
  const mode = (m: "code" | "quote") => setO((p) => ({ ...p, mode: m, text: m === "code" ? unesc(ui.hbK_sampleCode) : ui.hbK_sampleQuote, size: m === "code" ? 40 : 40 }));
  const [w, h] = RATIO_PX[o.ratio];
  return (
    <div className="hb-tool">
      <Seg label={ui.hbK_mode} value={o.mode} onChange={mode} options={[{ v: "code", t: ui.hbK_code }, { v: "quote", t: ui.hbK_quote }]} />
      <Field label={ui.hbK_in} wide><textarea dir="auto" rows={6} value={o.text} onChange={(e) => set("text", e.target.value)} spellCheck={false} className={o.mode === "code" ? "mono" : ""} /></Field>
      <div className="hb-grid2">
        {o.mode === "code" ? <Field label={ui.hbK_title}><input type="text" dir="ltr" value={o.title} onChange={(e) => set("title", e.target.value)} /></Field> : <Field label={ui.hbK_author}><input type="text" dir="auto" value={o.author} onChange={(e) => set("author", e.target.value)} /></Field>}
        <Field label={ui.hbK_theme}><select value={o.theme} onChange={(e) => set("theme", e.target.value as ThemeId)}>{(Object.keys(THEMES) as ThemeId[]).map((t) => <option key={t} value={t}>{ui[`hbK_th_${t}`]}</option>)}</select></Field>
        <Field label={ui.hbK_ratio}><select value={o.ratio} onChange={(e) => set("ratio", e.target.value as Ratio)}>{(["9:16", "16:9", "1:1", "4:5"] as Ratio[]).map((r) => <option key={r} value={r}>{ui[`hbK_r${r.replace(":", "")}`]}</option>)}</select></Field>
        <label className="hb-f"><span>{ui.hbK_font}: <b>{o.size}</b></span><input type="range" min={20} max={64} value={o.size} onChange={(e) => set("size", +e.target.value)} /></label>
        {o.mode === "code" && <Check label={ui.hbK_lines} checked={o.lineNumbers} onChange={(v) => set("lineNumbers", v)} />}
      </div>
      <div className="hb-f wide"><span>{ui.hbK_preview} <small>{w}×{h}</small></span><canvas ref={cv} className="hb-mock" style={{ aspectRatio: `${w} / ${h}` }} aria-label={ui.hbK_preview} /></div>
      <div className="hb-row"><button type="button" className="hb-btn primary" onClick={save}>{ui.hbK_dl}</button></div>
    </div>
  );
}
