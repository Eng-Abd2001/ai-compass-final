"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/convert/bytes";
import { COUNTRIES, fullNumber, tgPhoneLink, tgUserLink, validPhone, validTgUser, waLink } from "@/lib/hub/chat";
import { ACTIVITY, inToCm, lbToKg, plan, type Goal, type Sex } from "@/lib/hub/health";
import { RULES, allocate, splitBill } from "@/lib/hub/money";
import { Check, CopyBtn, Field, PinBtn, Seg, type HubUi } from "./ui";

/* ---------------- direct chat links ---------------- */
type Chan = "wa" | "tg";
export function ChatTool({ ui, lang, onOpenTool }: { ui: HubUi; lang: string; onOpenTool?: (id: "qr", preset: string) => void }) {
  const [chan, setChan] = useState<Chan>("wa");
  const [cc, setCc] = useState("966");
  const [num, setNum] = useState("");
  const [msg, setMsg] = useState("");
  const [by, setBy] = useState<"phone" | "user">("phone");
  const [user, setUser] = useState("");
  const digits = num.trim() ? fullNumber(cc, num) : "";
  const phoneOk = validPhone(digits);
  const userOk = validTgUser(user);
  let link = "", bad = "";
  if (chan === "wa") { if (num.trim()) { if (phoneOk) link = waLink(digits, msg); else bad = ui.hbC_invalid; } }
  else if (by === "phone") { if (num.trim()) { if (phoneOk) link = tgPhoneLink(digits); else bad = ui.hbC_invalid; } }
  else if (user.trim()) { if (userOk) link = tgUserLink(user.trim(), msg); else bad = ui.hbC_userBad; }
  const showNum = chan === "wa" || by === "phone";
  return (
    <div className="hb-tool">
      <Seg label={ui.hbT_chat} value={chan} onChange={setChan} options={[{ v: "wa", t: ui.hbC_wa }, { v: "tg", t: ui.hbC_tg }]} />
      {chan === "tg" && <Seg label={ui.hbC_by} value={by} onChange={setBy} options={[{ v: "phone", t: ui.hbC_byPhone }, { v: "user", t: ui.hbC_byUser }]} />}
      {showNum ? (
        <div className="hb-grid2">
          <Field label={ui.hbC_country}><select value={cc} onChange={(e) => setCc(e.target.value)}>{COUNTRIES.map((c) => <option key={c.cc} value={c.cc}>{lang === "ar" ? c.ar : c.en} (+{c.cc})</option>)}</select></Field>
          <Field label={ui.hbC_number}><input type="tel" dir="ltr" inputMode="tel" value={num} onChange={(e) => setNum(e.target.value)} placeholder={ui.hbC_numPh} autoComplete="off" /></Field>
        </div>
      ) : <Field label={ui.hbC_user}><input type="text" dir="ltr" value={user} onChange={(e) => setUser(e.target.value)} placeholder="@username" autoComplete="off" autoCapitalize="off" /></Field>}
      {(chan === "wa" || by === "user") && <Field label={ui.hbC_msg} wide><textarea dir="auto" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>}
      {bad && <p className="hb-hint bad" role="alert">{bad}</p>}
      {showNum && phoneOk && <p className="hb-hint">{fmt(ui.hbC_full, digits)}</p>}
      {link && (
        <>
          <div className="hb-f wide"><span>{ui.hbC_link}</span><code className="hb-code" dir="ltr">{link}</code></div>
          <div className="hb-row">
            <a className="hb-btn primary" href={link} target="_blank" rel="noopener noreferrer">{ui.hbC_open} ↗</a>
            <CopyBtn text={link} ui={ui} />
            <PinBtn text={link} title={link.replace(/^https:\/\//, "")} source={ui.hbT_chat} ui={ui} />
            {onOpenTool && <button type="button" className="hb-btn ghost" onClick={() => onOpenTool("qr", link)}>▦ {ui.hbC_toQr}</button>}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- interval timer (HIIT / Tabata) ---------------- */
type Seq = { phase: "prep" | "work" | "rest"; round: number; len: number }[];
function buildSeq(work: number, rest: number, rounds: number): Seq {
  const s: Seq = [{ phase: "prep", round: 0, len: 5 }];
  for (let r = 1; r <= rounds; r++) { s.push({ phase: "work", round: r, len: work }); if (r < rounds && rest > 0) s.push({ phase: "rest", round: r, len: rest }); }
  return s;
}
function IntervalTimer({ ui }: { ui: HubUi }) {
  const [cfg, setCfg] = useState({ work: 20, rest: 10, rounds: 8 });
  const seq = useMemo(() => buildSeq(cfg.work, cfg.rest, cfg.rounds), [cfg]);
  const total = seq.reduce((s, x) => s + x.len, 0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ac = useRef<AudioContext | null>(null);
  const lastBeep = useRef(-1);
  const beep = useCallback((f: number, ms = 120) => {
    try {
      ac.current ??= new AudioContext();
      const c = ac.current, o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; g.gain.value = 0.06; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + ms / 1000);
    } catch { /* audio unavailable */ }
  }, []);
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now() - elapsed * 1000;
    const id = setInterval(() => { const e = (Date.now() - t0) / 1000; if (e >= total) { setElapsed(total); setRunning(false); beep(880, 500); } else setElapsed(e); }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, total, beep]);
  let acc = 0, idx = 0;
  while (idx < seq.length - 1 && elapsed >= acc + seq[idx].len) { acc += seq[idx].len; idx++; }
  const cur = seq[idx], left = Math.max(0, Math.ceil(acc + cur.len - elapsed)), done = elapsed >= total;
  useEffect(() => {
    if (!running) return;
    const key = idx * 1000 + left;
    if (key === lastBeep.current) return;
    lastBeep.current = key;
    if (left === cur.len && elapsed > 0.05) beep(cur.phase === "work" ? 880 : 520, 220);
    else if (left <= 3 && left > 0) beep(660, 90);
  }, [running, idx, left, cur, elapsed, beep]);
  const frac = done ? 1 : (elapsed - acc) / cur.len;
  const label = done ? ui.hbL_pDone : cur.phase === "prep" ? ui.hbL_pPrep : cur.phase === "work" ? ui.hbL_pWork : ui.hbL_pRest;
  const preset = (w: number, r: number, n: number) => { setRunning(false); setElapsed(0); setCfg({ work: w, rest: r, rounds: n }); };
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="hb-timer">
      <h3>{ui.hbL_timer}</h3>
      <div className="hb-row"><button type="button" className="hb-btn ghost" onClick={() => preset(20, 10, 8)}>{ui.hbL_tabata}</button><button type="button" className="hb-btn ghost" onClick={() => preset(40, 20, 10)}>{ui.hbL_hiit}</button></div>
      <div className="hb-grid3">
        {([["work", ui.hbL_work, 5, 300], ["rest", ui.hbL_rest, 0, 300], ["rounds", ui.hbL_rounds, 1, 50]] as const).map(([k, t, mn, mx]) => (
          <Field key={k} label={t}><input type="number" min={mn} max={mx} value={cfg[k]} disabled={running} onChange={(e) => { setElapsed(0); setCfg({ ...cfg, [k]: Math.max(mn, Math.min(mx, +e.target.value || mn)) }); }} /></Field>
        ))}
      </div>
      <div className={`hb-ring ${done ? "done" : cur.phase}`} role="timer" aria-live="off">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r={R} className="bg" /><circle cx="60" cy="60" r={R} className="fg" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, frac))} transform="rotate(-90 60 60)" /></svg>
        <div><b>{done ? "✓" : left}</b><span>{label}</span>{!done && cur.round > 0 && <small>{fmt(ui.hbL_round, cur.round, cfg.rounds)}</small>}</div>
      </div>
      <div className="hb-row">
        <button type="button" className="hb-btn primary" onClick={() => { if (done) setElapsed(0); if (!running) { try { ac.current ??= new AudioContext(); void ac.current.resume(); } catch { /* ignore */ } } setRunning(!running); }}>{running ? ui.hbL_pause : ui.hbL_start}</button>
        <button type="button" className="hb-btn" onClick={() => { setRunning(false); setElapsed(0); lastBeep.current = -1; }}>{ui.hbL_reset}</button>
      </div>
    </div>
  );
}

/* ---------------- calories & macros ---------------- */
export function CalorieTool({ ui }: { ui: HubUi }) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(30);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [w, setW] = useState(75), [h, setH] = useState(175);
  const [act, setAct] = useState(2);
  const [goal, setGoal] = useState<Goal>("keep");
  const kg = units === "metric" ? w : lbToKg(w), cm = units === "metric" ? h : inToCm(h);
  const valid = age >= 15 && age <= 90 && kg >= 30 && kg <= 300 && cm >= 120 && cm <= 250;
  const p = valid ? plan({ sex, age, kg, cm, activity: ACTIVITY[act], goal }) : null;
  const switchUnits = (u: "metric" | "imperial") => { if (u === units) return; setUnits(u); if (u === "imperial") { setW(Math.round(w / 0.45359237)); setH(Math.round(h / 2.54)); } else { setW(Math.round(lbToKg(w))); setH(Math.round(inToCm(h))); } };
  const share = p ? [p.protein * 4, p.carbs * 4, p.fat * 9].map((x) => (x / (p.protein * 4 + p.carbs * 4 + p.fat * 9)) * 100) : [0, 0, 0];
  const summary = p ? `${ui.hbL_target}: ${p.target} ${ui.hbL_kcal}\n${ui.hbL_protein}: ${p.protein} g\n${ui.hbL_carbs}: ${p.carbs} g\n${ui.hbL_fat}: ${p.fat} g` : "";
  return (
    <div className="hb-tool">
      <div className="hb-grid2">
        <Field label={ui.hbL_sex}><Seg label={ui.hbL_sex} value={sex} onChange={setSex} options={[{ v: "male", t: ui.hbL_male }, { v: "female", t: ui.hbL_female }]} /></Field>
        <Field label={ui.hbL_units}><Seg label={ui.hbL_units} value={units} onChange={switchUnits} options={[{ v: "metric", t: ui.hbL_metric }, { v: "imperial", t: ui.hbL_imperial }]} /></Field>
        <Field label={ui.hbL_age}><input type="number" min={15} max={90} value={age} onChange={(e) => setAge(+e.target.value)} /></Field>
        <Field label={`${ui.hbL_weight} (${units === "metric" ? "kg" : "lb"})`}><input type="number" min={1} value={w} onChange={(e) => setW(+e.target.value)} /></Field>
        <Field label={`${ui.hbL_height} (${units === "metric" ? "cm" : "in"})`}><input type="number" min={1} value={h} onChange={(e) => setH(+e.target.value)} /></Field>
        <Field label={ui.hbL_act}><select value={act} onChange={(e) => setAct(+e.target.value)}>{[1, 2, 3, 4, 5].map((n, i) => <option key={n} value={i}>{ui[`hbL_a${n}`]}</option>)}</select></Field>
        <Field label={ui.hbL_goal} wide><Seg label={ui.hbL_goal} value={goal} onChange={setGoal} options={[{ v: "lose", t: ui.hbL_lose }, { v: "keep", t: ui.hbL_keep }, { v: "gain", t: ui.hbL_gain }]} /></Field>
      </div>
      {p && (
        <div className="hb-resbox">
          <div className="hb-big"><b>{p.target}</b><span>{ui.hbL_kcal} / {ui.hbL_target}</span></div>
          <div className="hb-bar" role="img" aria-label={`${ui.hbL_protein} ${p.protein} g, ${ui.hbL_carbs} ${p.carbs} g, ${ui.hbL_fat} ${p.fat} g`}>
            {share.map((s, i) => <i key={i} style={{ width: `${s}%` }} className={`m${i}`} />)}
          </div>
          <dl className="hb-stats">
            <div><dt><i className="dot m0" />{ui.hbL_protein}</dt><dd>{p.protein} g</dd></div><div><dt><i className="dot m1" />{ui.hbL_carbs}</dt><dd>{p.carbs} g</dd></div><div><dt><i className="dot m2" />{ui.hbL_fat}</dt><dd>{p.fat} g</dd></div>
            <div><dt>{ui.hbL_bmr}</dt><dd>{p.bmr}</dd></div><div><dt>{ui.hbL_tdee}</dt><dd>{p.tdee}</dd></div><div><dt>{ui.hbL_water}</dt><dd>{(p.water / 1000).toFixed(1)} L</dd></div><div><dt>{ui.hbL_bmi}</dt><dd>{p.bmi}</dd></div>
          </dl>
          {p.floored && <p className="hb-warn">⚠ {ui.hbL_floor}</p>}
          <div className="hb-row"><CopyBtn text={summary} ui={ui} /><PinBtn text={summary} title={`${p.target} ${ui.hbL_kcal}`} source={ui.hbT_calorie} ui={ui} /></div>
        </div>
      )}
      <p className="hb-hint">{ui.hbL_disc}</p>
      <IntervalTimer ui={ui} />
    </div>
  );
}

/* ---------------- budget & bill splitter ---------------- */
export function BudgetTool({ ui }: { ui: HubUi }) {
  const [tab, setTab] = useState<"split" | "salary">("split");
  const [cur, setCur] = useState("");
  const [total, setTotal] = useState(120), [tip, setTip] = useState(10), [people, setPeople] = useState(3);
  const [weights, setWeights] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const [names, setNames] = useState<string[]>(Array(12).fill(""));
  const [income, setIncome] = useState(3000);
  const [rule, setRule] = useState("50/30/20");
  const [pct, setPct] = useState<number[]>([50, 30, 20]);
  const n = Math.max(2, Math.min(12, people));
  const sb = splitBill(total, tip, weights.slice(0, n));
  const m = (x: number) => `${x.toFixed(2)}${cur ? ` ${cur}` : ""}`;
  const splitText = [`${ui.hbB_total}: ${m(total)}`, `${ui.hbB_tipAmt}: ${m(sb.tip)}`, `${ui.hbB_grand}: ${m(sb.grand)}`, ...sb.shares.map((s, i) => `${names[i].trim() || fmt(ui.hbB_name, i + 1)}: ${m(s)}`)].join("\n");
  const sum = pct.reduce((s, x) => s + x, 0), good = sum === 100;
  const amounts = good ? allocate(income, pct) : [0, 0, 0];
  const labels = [ui.hbB_needs, ui.hbB_wants, ui.hbB_save];
  const salaryText = good ? `${ui.hbB_income}: ${m(income)}\n${labels.map((l, i) => `${l} (${pct[i]}%): ${m(amounts[i])}`).join("\n")}` : "";
  return (
    <div className="hb-tool">
      <Seg label={ui.hbT_budget} value={tab} onChange={setTab} options={[{ v: "split", t: ui.hbB_split }, { v: "salary", t: ui.hbB_salary }]} />
      <Field label={ui.hbB_cur}><input type="text" dir="auto" maxLength={6} value={cur} onChange={(e) => setCur(e.target.value)} placeholder="SAR" /></Field>
      {tab === "split" ? (
        <>
          <div className="hb-grid3">
            <Field label={ui.hbB_total}><input type="number" min={0} step="0.01" value={total} onChange={(e) => setTotal(+e.target.value)} /></Field>
            <Field label={ui.hbB_tip}><input type="number" min={0} max={100} value={tip} onChange={(e) => setTip(+e.target.value)} /></Field>
            <Field label={ui.hbB_people}><input type="number" min={2} max={12} value={people} onChange={(e) => setPeople(+e.target.value)} /></Field>
          </div>
          <ul className="hb-people">
            {Array.from({ length: n }, (_, i) => (
              <li key={i}>
                <input type="text" dir="auto" aria-label={fmt(ui.hbB_name, i + 1)} placeholder={fmt(ui.hbB_name, i + 1)} value={names[i]} onChange={(e) => setNames(names.map((x, k) => (k === i ? e.target.value : x)))} />
                <label><span>{ui.hbB_weight}</span><input type="number" min={0} step="0.5" value={weights[i]} onChange={(e) => setWeights(weights.map((x, k) => (k === i ? Math.max(0, +e.target.value) : x)))} /></label>
                <b>{m(sb.shares[i] ?? 0)}</b>
              </li>
            ))}
          </ul>
          <dl className="hb-stats"><div><dt>{ui.hbB_tipAmt}</dt><dd>{m(sb.tip)}</dd></div><div><dt>{ui.hbB_grand}</dt><dd>{m(sb.grand)}</dd></div></dl>
          <div className="hb-row"><CopyBtn text={splitText} ui={ui} /><PinBtn text={splitText} title={`${ui.hbB_split} ${m(sb.grand)}`} source={ui.hbT_budget} ui={ui} /></div>
        </>
      ) : (
        <>
          <div className="hb-grid2">
            <Field label={ui.hbB_income}><input type="number" min={0} value={income} onChange={(e) => setIncome(+e.target.value)} /></Field>
            <Field label={ui.hbB_rule}><select value={rule} onChange={(e) => { setRule(e.target.value); if (RULES[e.target.value]) setPct([...RULES[e.target.value]]); }}>{Object.keys(RULES).map((r) => <option key={r} value={r}>{r}</option>)}<option value="custom">{ui.hbB_custom}</option></select></Field>
          </div>
          <div className="hb-grid3">{labels.map((l, i) => <Field key={l} label={`${l} %`}><input type="number" min={0} max={100} value={pct[i]} onChange={(e) => { setRule("custom"); setPct(pct.map((x, k) => (k === i ? Math.max(0, Math.min(100, +e.target.value)) : x))); }} /></Field>)}</div>
          {!good && <p className="hb-hint bad" role="alert">{fmt(ui.hbB_sum, sum)}</p>}
          <div className="hb-bar big" role="img" aria-label={labels.map((l, i) => `${l} ${pct[i]}%`).join(", ")}>{pct.map((x, i) => <i key={i} className={`m${i}`} style={{ width: `${good ? x : 0}%` }}>{good && x >= 12 ? `${x}%` : ""}</i>)}</div>
          <dl className="hb-stats">{labels.map((l, i) => <div key={l}><dt><i className={`dot m${i}`} />{l}</dt><dd>{m(amounts[i])}</dd></div>)}</dl>
          <div className="hb-row"><CopyBtn text={salaryText} ui={ui} /><PinBtn text={salaryText} title={`${rule} · ${m(income)}`} source={ui.hbT_budget} ui={ui} disabled={!good} /></div>
        </>
      )}
    </div>
  );
}
