"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { fmt } from "@/lib/convert/bytes";
import { lineDiff } from "@/lib/hub/diff";
import { extract, type SnKind } from "@/lib/hub/sniper";
import { SAN_DEFAULTS, fmtDuration, sanitize, speechSeconds, stats, VIDEO_LIMITS, type Digits, type SanOpts } from "@/lib/hub/text";
import { Check, CopyBtn, PinBtn, Seg, download, textBlob, unesc, type HubUi } from "./ui";

export function SanitizerTool({ ui }: { ui: HubUi }) {
  const [text, setText] = useState("");
  const [o, setO] = useState<SanOpts>(SAN_DEFAULTS);
  const [wpm, setWpm] = useState(130);
  const dText = useDeferredValue(text);
  const out = useMemo(() => sanitize(dText, o), [dText, o]);
  const st = useMemo(() => stats(out), [out]);
  const secs = speechSeconds(st.words, wpm);
  const set = <K extends keyof SanOpts>(k: K, v: SanOpts[K]) => setO((p) => ({ ...p, [k]: v }));
  return (
    <div className="hb-tool">
      <div className="hb-f wide"><span>{ui.hbS_in}</span>
        <textarea dir="auto" rows={6} value={text} placeholder={ui.hbS_ph} onChange={(e) => setText(e.target.value)} />
        <div className="hb-row"><button type="button" className="hb-btn ghost" onClick={() => setText(unesc(ui.hbS_sample))}>{ui.hbSample}</button><button type="button" className="hb-btn ghost" onClick={() => setText("")} disabled={!text}>{ui.hbClear}</button></div>
      </div>
      <div className="hb-checks">
        <Check label={ui.hbS_tashkeel} checked={o.tashkeel} onChange={(v) => set("tashkeel", v)} />
        <Check label={ui.hbS_hamza} checked={o.hamza} onChange={(v) => set("hamza", v)} />
        <Check label={ui.hbS_yaa} checked={o.yaa} onChange={(v) => set("yaa", v)} />
        <Check label={ui.hbS_taa} checked={o.taa} onChange={(v) => set("taa", v)} />
        <Check label={ui.hbS_tatweel} checked={o.tatweel} onChange={(v) => set("tatweel", v)} />
        <Check label={ui.hbS_spaces} checked={o.spaces} onChange={(v) => set("spaces", v)} />
        <Check label={ui.hbS_dup} checked={o.dupLines} onChange={(v) => set("dupLines", v)} />
      </div>
      <label className="hb-f"><span>{ui.hbS_digits}</span>
        <select value={o.digits} onChange={(e) => set("digits", e.target.value as Digits)}>
          <option value="keep">{ui.hbS_dKeep}</option><option value="west">{ui.hbS_dWest}</option><option value="arabic">{ui.hbS_dAr}</option>
        </select>
      </label>
      <div className="hb-f wide"><span>{ui.hbResult}</span><textarea dir="auto" rows={6} readOnly value={out} aria-label={ui.hbResult} /></div>
      <div className="hb-row"><CopyBtn text={out} ui={ui} /><PinBtn text={out} title={out.slice(0, 40)} source={ui.hbT_sanitizer} ui={ui} /></div>
      <dl className="hb-stats">
        {([["hbS_words", st.words], ["hbS_chars", st.chars], ["hbS_lines", st.lines], ["hbS_sent", st.sentences]] as const).map(([k, v]) => <div key={k}><dt>{ui[k]}</dt><dd>{v}</dd></div>)}
        <div><dt>{ui.hbS_time}</dt><dd>{fmtDuration(secs)}</dd></div>
      </dl>
      <div className="hb-f wide"><span>{ui.hbS_vid}</span>
        <Seg label={ui.hbS_pace} value={String(wpm)} onChange={(v) => setWpm(+v)} options={[{ v: "130", t: ui.hbS_calm }, { v: "160", t: ui.hbS_fast }]} />
        <ul className="hb-pills">
          {VIDEO_LIMITS.map((l) => <li key={l} className={secs <= l ? "good" : "bad"}>{secs <= l ? `✓ ${fmt(ui.hbS_fits, l)}` : `✗ ${fmt(ui.hbS_over, l, secs - l)}`}</li>)}
        </ul>
      </div>
    </div>
  );
}

const KINDS: SnKind[] = ["email", "url", "phone", "hashtag", "price"];
export function SniperTool({ ui }: { ui: HubUi }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<SnKind>("email");
  const [uniq, setUniq] = useState(true);
  const dText = useDeferredValue(text);
  const all = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, extract(dText, k, uniq)])) as Record<SnKind, string[]>, [dText, uniq]);
  const res = all[kind];
  const joined = res.join("\n");
  return (
    <div className="hb-tool">
      <div className="hb-f wide"><span>{ui.hbN_in}</span>
        <textarea dir="auto" rows={6} value={text} placeholder={ui.hbN_ph} onChange={(e) => setText(e.target.value)} />
        <div className="hb-row"><button type="button" className="hb-btn ghost" onClick={() => setText(ui.hbN_sample)}>{ui.hbSample}</button><button type="button" className="hb-btn ghost" onClick={() => setText("")} disabled={!text}>{ui.hbClear}</button></div>
      </div>
      <div className="hb-seg" role="group" aria-label={ui.hbT_sniper}>
        {KINDS.map((k) => <button type="button" key={k} aria-pressed={k === kind} onClick={() => setKind(k)}>{ui[`hbN_${k}`]} <small>{all[k].length}</small></button>)}
      </div>
      <Check label={ui.hbN_unique} checked={uniq} onChange={setUniq} />
      <p className="hb-hint">{res.length ? fmt(ui.hbN_found, res.length) : ui.hbN_none}</p>
      {res.length > 0 && <ol className="hb-list" dir="auto">{res.map((r, i) => <li key={`${r}${i}`} dir="auto">{r}</li>)}</ol>}
      <div className="hb-row">
        <CopyBtn text={joined} ui={ui} label={ui.hbN_copyAll} />
        <button type="button" className="hb-btn" disabled={!res.length} onClick={() => download(`${kind}.txt`, textBlob(joined))}>{ui.hbN_dl}</button>
        <PinBtn text={joined} title={`${ui[`hbN_${kind}`]} (${res.length})`} source={ui.hbT_sniper} ui={ui} />
      </div>
    </div>
  );
}

export function DiffTool({ ui }: { ui: HubUi }) {
  const [a, setA] = useState(""), [b, setB] = useState("");
  const [ic, setIc] = useState(false), [is, setIs] = useState(false), [only, setOnly] = useState(false);
  const da = useDeferredValue(a), db = useDeferredValue(b);
  const d = useMemo(() => (da || db ? lineDiff(da, db, { ignoreCase: ic, ignoreSpace: is }) : undefined), [da, db, ic, is]);
  const rows = d ? (only ? d.rows.filter((r) => r.kind !== "same") : d.rows).slice(0, 1500) : [];
  const summary = d ? `${fmt(ui.hbF_added, d.added)} · ${fmt(ui.hbF_removed, d.removed)} · ${fmt(ui.hbF_changed, d.changed)} · ${fmt(ui.hbF_same, d.same)}` : "";
  return (
    <div className="hb-tool">
      <div className="hb-two">
        <label className="hb-f"><span>{ui.hbF_a}</span><textarea dir="ltr" rows={7} value={a} onChange={(e) => setA(e.target.value)} spellCheck={false} /></label>
        <label className="hb-f"><span>{ui.hbF_b}</span><textarea dir="ltr" rows={7} value={b} onChange={(e) => setB(e.target.value)} spellCheck={false} /></label>
      </div>
      <div className="hb-row">
        <button type="button" className="hb-btn ghost" onClick={() => { setA(unesc(ui.hbF_sa)); setB(unesc(ui.hbF_sb)); }}>{ui.hbSample}</button>
        <button type="button" className="hb-btn ghost" onClick={() => { setA(b); setB(a); }}>⇄ {ui.hbF_swap}</button>
        <button type="button" className="hb-btn ghost" onClick={() => { setA(""); setB(""); }} disabled={!a && !b}>{ui.hbClear}</button>
      </div>
      <div className="hb-checks"><Check label={ui.hbF_case} checked={ic} onChange={setIc} /><Check label={ui.hbF_space} checked={is} onChange={setIs} /><Check label={ui.hbF_only} checked={only} onChange={setOnly} /></div>
      {(a || b) && d === null && <p className="hb-hint bad">{ui.hbF_big}</p>}
      {d && (
        <>
          <p className="hb-hint" role="status">{d.added + d.removed + d.changed === 0 ? ui.hbF_identical : summary}</p>
          <div className="hb-diff" dir="ltr" role="table" aria-label={summary}>
            {rows.map((r, i) => (
              <div key={i} className={`hb-dr ${r.kind}`} role="row">
                <span className="hb-dn">{r.li ?? ""}</span><code className="hb-dl">{r.l ?? ""}</code>
                <span className="hb-dn">{r.ri ?? ""}</span><code className="hb-dl">{r.r ?? ""}</code>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
