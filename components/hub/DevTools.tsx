"use client";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/convert/bytes";
import { decide, type Crit } from "@/lib/hub/decide";
import { b64decode, b64encode, jsonFormat, jsonToCsv, password, sha256, strength, urlDecode, urlEncode, uuid, type PwOpts } from "@/lib/hub/dev";
import { Check, CopyBtn, Field, PinBtn, Seg, download, textBlob, type HubUi } from "./ui";

type Tab = "json" | "csv" | "b64" | "url" | "pw" | "hash";
export function SwissTool({ ui }: { ui: HubUi }) {
  const [tab, setTab] = useState<Tab>("json");
  const [inp, setInp] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "min">("2");
  const [sort, setSort] = useState(false);
  const [dec, setDec] = useState(false);
  const [safe, setSafe] = useState(false);
  const [delim, setDelim] = useState(",");
  const [pw, setPw] = useState<PwOpts>({ len: 20, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true });
  const [gen, setGen] = useState<{ text: string; bits: number }>({ text: "", bits: 0 });
  const [id, setId] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => { setGen(password(pw)); }, [pw]);
  useEffect(() => { if (tab !== "hash") return; let dead = false; sha256(inp).then((h) => { if (!dead) setHash(h); }).catch(() => setHash("")); return () => { dead = true; }; }, [tab, inp]);
  const res = useMemo(() => {
    if (tab === "json") { const r = jsonFormat(inp, indent === "min" ? "min" : +indent, sort); return inp.trim() ? (r.ok ? { out: r.out, note: ui.hbW_valid, bad: false } : { out: "", note: fmt(ui.hbW_err, r.line ?? "?", r.col ?? "?"), bad: true }) : { out: "", note: "", bad: false }; }
    if (tab === "csv") { try { return { out: inp.trim() ? jsonToCsv(inp, delim) : "", note: "", bad: false }; } catch { return { out: "", note: ui.hbW_err.replace("{0}", "?").replace("{1}", "?"), bad: true }; } }
    if (tab === "b64") { try { return { out: dec ? b64decode(inp) : b64encode(inp, safe), note: "", bad: false }; } catch { return { out: "", note: ui.hbW_bad, bad: !!inp.trim() }; } }
    if (tab === "url") { try { return { out: dec ? urlDecode(inp) : urlEncode(inp), note: "", bad: false }; } catch { return { out: "", note: ui.hbW_bad, bad: !!inp.trim() }; } }
    return { out: "", note: "", bad: false };
  }, [tab, inp, indent, sort, dec, safe, delim, ui]);
  const setP = <K extends keyof PwOpts>(k: K, v: PwOpts[K]) => setPw((p) => ({ ...p, [k]: v }));
  const tabs: { v: Tab; t: string }[] = [{ v: "json", t: ui.hbW_json }, { v: "csv", t: ui.hbW_csv }, { v: "b64", t: ui.hbW_b64 }, { v: "url", t: ui.hbW_url }, { v: "pw", t: ui.hbW_pw }, { v: "hash", t: ui.hbW_hash }];
  const out = tab === "pw" ? gen.text : tab === "hash" ? hash : res.out;
  return (
    <div className="hb-tool">
      <Seg label={ui.hbT_swiss} value={tab} onChange={(t) => { setTab(t); }} options={tabs} />
      {tab !== "pw" && <Field label={ui.hbW_in} wide><textarea dir="ltr" rows={6} value={inp} onChange={(e) => setInp(e.target.value)} spellCheck={false} className="mono" /></Field>}
      {tab === "json" && <div className="hb-row"><Seg label={ui.hbW_format} value={indent} onChange={setIndent} options={[{ v: "2", t: "2" }, { v: "4", t: "4" }, { v: "min", t: ui.hbW_minify }]} /><Check label={ui.hbW_sort} checked={sort} onChange={setSort} /></div>}
      {tab === "csv" && <Field label={ui.hbW_delim}><select value={delim} onChange={(e) => setDelim(e.target.value)}><option value=",">,</option><option value=";">;</option><option value={"\t"}>Tab</option></select></Field>}
      {(tab === "b64" || tab === "url") && <div className="hb-row"><Seg label={ui.hbT_swiss} value={dec ? "d" : "e"} onChange={(v) => setDec(v === "d")} options={[{ v: "e", t: ui.hbW_enc }, { v: "d", t: ui.hbW_dec }]} />{tab === "b64" && !dec && <Check label={ui.hbW_urlsafe} checked={safe} onChange={setSafe} />}</div>}
      {tab === "pw" && (
        <>
          <label className="hb-f"><span>{ui.hbW_len}: <b>{pw.len}</b></span><input type="range" min={8} max={64} value={pw.len} onChange={(e) => setP("len", +e.target.value)} /></label>
          <div className="hb-checks"><Check label={ui.hbW_lower} checked={pw.lower} onChange={(v) => setP("lower", v)} /><Check label={ui.hbW_upper} checked={pw.upper} onChange={(v) => setP("upper", v)} /><Check label={ui.hbW_digits} checked={pw.digits} onChange={(v) => setP("digits", v)} /><Check label={ui.hbW_symbols} checked={pw.symbols} onChange={(v) => setP("symbols", v)} /><Check label={ui.hbW_amb} checked={pw.noAmbiguous} onChange={(v) => setP("noAmbiguous", v)} /></div>
          <div className="hb-f wide"><span>{ui.hbW_out}</span><code className="hb-code big" dir="ltr">{gen.text}</code></div>
          <p className="hb-meter" data-level={strength(gen.bits)}>{ui[`hbW_s${strength(gen.bits)}`]} · {fmt(ui.hbW_bits, gen.bits)}</p>
          <div className="hb-row"><button type="button" className="hb-btn primary" onClick={() => setGen(password(pw))}>{ui.hbW_gen}</button></div>
          <div className="hb-f wide"><span>{ui.hbW_uuid}</span><code className="hb-code" dir="ltr">{id || "—"}</code></div>
          <div className="hb-row"><button type="button" className="hb-btn" onClick={() => setId(uuid())}>{ui.hbW_gen} UUID</button><CopyBtn text={id} ui={ui} /></div>
        </>
      )}
      {tab === "hash" && <p className="hb-hint">{ui.hbW_hashHint}</p>}
      {tab !== "pw" && (
        <>
          {res.note && <p className={`hb-hint${res.bad ? " bad" : " good"}`} role="status">{res.note}</p>}
          <div className="hb-f wide"><span>{ui.hbW_out}</span><textarea dir="ltr" rows={6} readOnly value={out} aria-label={ui.hbW_out} className="mono" /></div>
        </>
      )}
      <div className="hb-row">
        <CopyBtn text={out} ui={ui} />
        {tab !== "pw" && <button type="button" className="hb-btn" disabled={!out} onClick={() => download(`${tab === "csv" ? "data.csv" : tab === "json" ? "data.json" : "output.txt"}`, textBlob(out))}>{ui.hbDownload}</button>}
        <PinBtn text={out} title={out.slice(0, 40)} source={ui.hbT_swiss} ui={ui} />
      </div>
    </div>
  );
}

/* ---------------- decision matrix ---------------- */
type Opt = { name: string; scores: number[] };
const EX1 = (ui: HubUi): { crits: Crit[]; opts: Opt[] } => ({ crits: [{ name: ui.hbD_cCost, weight: 4, benefit: false }, { name: "Performance", weight: 5, benefit: true }, { name: "Battery", weight: 3, benefit: true }, { name: "Weight", weight: 2, benefit: false }], opts: [{ name: "Laptop A", scores: [7, 9, 6, 6] }, { name: "Laptop B", scores: [4, 6, 8, 3] }, { name: "Laptop C", scores: [9, 5, 5, 4] }] });
const EX2 = (ui: HubUi): { crits: Crit[]; opts: Opt[] } => ({ crits: [{ name: "Salary", weight: 5, benefit: true }, { name: "Commute", weight: 3, benefit: false }, { name: "Growth", weight: 4, benefit: true }], opts: [{ name: "Offer A", scores: [8, 7, 5] }, { name: "Offer B", scores: [6, 3, 9] }] });
export function DecisionTool({ ui }: { ui: HubUi }) {
  const init = () => ({ crits: [{ name: ui.hbD_cCost, weight: 3, benefit: false }, { name: ui.hbD_cTime, weight: 2, benefit: false }, { name: ui.hbD_cBenefit, weight: 5, benefit: true }, { name: ui.hbD_cEase, weight: 3, benefit: true }] as Crit[], opts: [{ name: "", scores: [5, 5, 5, 5] }, { name: "", scores: [5, 5, 5, 5] }] as Opt[] });
  const [st, setSt] = useState(init);
  const { crits, opts } = st;
  const v = useMemo(() => decide(opts.map((o, i) => ({ name: o.name || fmt(ui.hbD_optName, i + 1), scores: o.scores })), crits), [opts, crits, ui]);
  const nm = (i: number) => opts[i].name.trim() || fmt(ui.hbD_optName, i + 1);
  const setCrit = (i: number, p: Partial<Crit>) => setSt({ ...st, crits: crits.map((c, k) => (k === i ? { ...c, ...p } : c)) });
  const setScore = (oi: number, ci: number, val: number) => setSt({ ...st, opts: opts.map((o, k) => (k === oi ? { ...o, scores: o.scores.map((s, j) => (j === ci ? val : s)) } : o)) });
  const addOpt = () => opts.length < 6 && setSt({ ...st, opts: [...opts, { name: "", scores: crits.map(() => 5) }] });
  const addCrit = () => crits.length < 6 && setSt({ crits: [...crits, { name: "", weight: 3, benefit: true }], opts: opts.map((o) => ({ ...o, scores: [...o.scores, 5] })) });
  const summary = `${ui.hbD_winner}: ${nm(v.best)}\n${opts.map((_, i) => `${nm(i)}: ${v.totals[i]}`).join("\n")}`;
  return (
    <div className="hb-tool">
      <div className="hb-row"><span className="hb-hint">{ui.hbD_preset}:</span>
        <button type="button" className="hb-btn ghost" onClick={() => setSt(EX1(ui))}>{ui.hbD_ex1}</button><button type="button" className="hb-btn ghost" onClick={() => setSt(EX2(ui))}>{ui.hbD_ex2}</button></div>
      <div className="hb-scroll">
        <table className="hb-matrix">
          <thead><tr><th scope="col">{ui.hbD_crits}</th><th scope="col">{ui.hbD_weight}</th>{opts.map((o, i) => (
            <th scope="col" key={i}><input type="text" dir="auto" aria-label={fmt(ui.hbD_optName, i + 1)} placeholder={fmt(ui.hbD_optName, i + 1)} value={o.name} onChange={(e) => setSt({ ...st, opts: opts.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
              {opts.length > 2 && <button type="button" className="hb-x" aria-label={`${ui.hbD_remove} ${nm(i)}`} onClick={() => setSt({ ...st, opts: opts.filter((_, k) => k !== i) })}>✕</button>}</th>))}</tr></thead>
          <tbody>
            {crits.map((c, ci) => (
              <tr key={ci}>
                <th scope="row"><input type="text" dir="auto" aria-label={fmt(ui.hbD_critName, ci + 1)} placeholder={fmt(ui.hbD_critName, ci + 1)} value={c.name} onChange={(e) => setCrit(ci, { name: e.target.value })} />
                  <select aria-label={ui.hbD_benefit} value={c.benefit ? "b" : "c"} onChange={(e) => setCrit(ci, { benefit: e.target.value === "b" })}><option value="b">{ui.hbD_benefit}</option><option value="c">{ui.hbD_cost}</option></select>
                  {crits.length > 2 && <button type="button" className="hb-x" aria-label={`${ui.hbD_remove} ${c.name}`} onClick={() => setSt({ crits: crits.filter((_, k) => k !== ci), opts: opts.map((o) => ({ ...o, scores: o.scores.filter((_, k) => k !== ci) })) })}>✕</button>}</th>
                <td><input type="number" min={1} max={5} aria-label={ui.hbD_weight} value={c.weight} onChange={(e) => setCrit(ci, { weight: Math.max(1, Math.min(5, +e.target.value || 1)) })} /></td>
                {opts.map((o, oi) => <td key={oi}><input type="number" min={1} max={10} aria-label={`${nm(oi)} · ${c.name || ci + 1} · ${ui.hbD_score}`} value={o.scores[ci]} onChange={(e) => setScore(oi, ci, Math.max(1, Math.min(10, +e.target.value || 1)))} /></td>)}
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row" colSpan={2}>{ui.hbD_total} /100</th>{opts.map((_, i) => <td key={i} className={i === v.best && !v.tie ? "win" : ""}>{v.totals[i]}</td>)}</tr></tfoot>
        </table>
      </div>
      <div className="hb-row"><button type="button" className="hb-btn" onClick={addOpt} disabled={opts.length >= 6}>+ {ui.hbD_opts}</button><button type="button" className="hb-btn" onClick={addCrit} disabled={crits.length >= 6}>+ {ui.hbD_crits}</button><span className="hb-hint">{ui.hbD_max}</span></div>
      <div className="hb-verdict" role="status">
        {v.tie ? <p className="hb-warn">{ui.hbD_tie}</p> : <><span>{ui.hbD_winner}</span><b>🏆 {nm(v.best)}</b><small>{fmt(ui.hbD_margin, v.margin)}</small></>}
        <div className="hb-bars">{opts.map((_, i) => <div key={i} className={i === v.best && !v.tie ? "win" : ""}><span>{nm(i)}</span><i style={{ width: `${v.totals[i]}%` }} /><b>{v.totals[i]}</b></div>)}</div>
      </div>
      <div className="hb-row"><CopyBtn text={summary} ui={ui} /><PinBtn text={summary} title={`${ui.hbD_winner}: ${nm(v.best)}`} source={ui.hbT_decision} ui={ui} /></div>
    </div>
  );
}
