// Reads the simple-text files in /content, checks them, and returns the data the site uses.
// File format everywhere:  key: value   (one per line) | "# ..." = comment | "---" = new record.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

export const GOALS = ["learn", "money", "build", "automate", "create", "study"];
export const ADS_SLOTS = ["after-hero", "tools-grid-native", "between-sections", "before-footer", "mobile-sticky", "tool-after-intro", "tool-sidebar", "tools-index-inline"];
export const STALE_DAYS = 90;

/* ---------- friendly errors (collected, then reported together) ---------- */
const errors = [];
const bad = (file, line, msg) => errors.push(`  ❌ ${file}${line ? `  —  سطر ${line}` : ""}\n     ${msg}`);
export function throwIfErrors() {
  if (!errors.length) return;
  const list = errors.splice(0);
  throw new Error(`\n\nوُجد ${list.length} خطأ في ملفات المحتوى (مجلد content):\n\n${list.join("\n\n")}\n\nصحّح الأخطاء ثم أعد التشغيل:  npm run check\n`);
}

/* ---------- one record = one Block ---------- */
class Block {
  constructor(file, lines) { this.file = file; this.lines = lines; this.seen = new Set(); this.at = lines[0].n; }
  many(k) { this.seen.add(k); return this.lines.filter((l) => l.k === k); }
  ln(k) { const a = this.many(k); return a[0] ? a[0].n : this.at; }
  str(k, req = false) {
    const a = this.many(k);
    if (a.length > 1) bad(this.file, a[1].n, `الحقل «${k}» مكتوب أكثر من مرة. اتركه مرة واحدة.`);
    const v = a[0] ? a[0].v : "";
    if (req && !v) bad(this.file, this.ln(k), `الحقل «${k}» مطلوب ولا يجوز أن يبقى فارغًا.`);
    return v;
  }
  pair(k, req = false) { return [this.str(`${k}_en`, req), this.str(`${k}_ar`, req)]; }
  url(k, req = false) {
    const v = this.str(k, req);
    if (v && !/^https:\/\/\S+$/.test(v)) bad(this.file, this.ln(k), `«${k}» يجب أن يكون رابطًا كاملًا يبدأ بـ https://  (كتبتَ: ${v})`);
    return v;
  }
  pick(k, map, req = true) {
    const v = this.str(k, req).toLowerCase();
    if (!v) return undefined;
    if (!(v in map)) { bad(this.file, this.ln(k), `القيمة «${v}» غير مقبولة في «${k}». المسموح: ${Object.keys(map).join(" / ")}`); return undefined; }
    return map[v];
  }
  list(k, allowed, req = true) {
    const v = this.str(k, req);
    const items = v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const i of items) if (!allowed.includes(i)) bad(this.file, this.ln(k), `«${i}» غير موجود في «${k}». المسموح: ${allowed.join(", ")}`);
    return [...new Set(items)];
  }
  int(k, min, max, req = true) {
    const v = this.str(k, req);
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) { bad(this.file, this.ln(k), `«${k}» يجب أن يكون رقمًا صحيحًا بين ${min} و${max} (كتبتَ: ${v})`); return undefined; }
    return n;
  }
  done() {
    const known = [...this.seen];
    for (const l of this.lines) if (!this.seen.has(l.k)) bad(this.file, l.n, `الحقل «${l.k}» غير معروف (ربما خطأ إملائي). الحقول المعروفة هنا: ${known.join(", ")}`);
  }
}

export function parse(file, keepCase = false) {
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const blocks = [[]];
  text.split(/\r?\n/).forEach((raw, i) => {
    const s = raw.trim();
    if (!s || s.startsWith("#")) return;
    if (/^-{3,}$/.test(s)) { blocks.push([]); return; }
    const m = raw.match(/^\s*([A-Za-z][A-Za-z0-9_.]*)\s*:\s*(.*)$/);
    if (!m) { bad(file, i + 1, `السطر لا يطابق الصيغة «الاسم: القيمة».  النص: «${s.slice(0, 50)}»`); return; }
    blocks.at(-1).push({ k: keepCase ? m[1] : m[1].toLowerCase(), v: m[2].trim(), n: i + 1 });
  });
  return blocks.filter((b) => b.length).map((l) => new Block(file, l));
}

const YN = { yes: 1, no: 0, "نعم": 1, "لا": 0 };
const YNU = { ...YN, unknown: null, "غير معروف": null };
const need = (path) => { if (!existsSync(path)) { bad(path, 0, "الملف غير موجود."); return false; } return true; };

/* ---------- lists: categories, platforms ---------- */
export function loadCategories(file) {
  const out = {};
  if (!need(file)) return out;
  for (const b of parse(file)) {
    const id = b.str("id", true).toLowerCase();
    if (id && !/^[a-z0-9-]+$/.test(id)) bad(file, b.ln("id"), "«id» حروف إنجليزية صغيرة وأرقام وشرطة فقط.");
    if (id && out[id]) bad(file, b.at, `التصنيف «${id}» مكرر.`);
    out[id] = { en: b.str("en", true), ar: b.str("ar", true) };
    b.done();
  }
  return out;
}
export function loadPlatforms(file) {
  const out = {};
  if (!need(file)) return out;
  for (const b of parse(file)) {
    const id = b.str("id", true).toLowerCase();
    if (id && out[id]) bad(file, b.at, `المنصة «${id}» مكررة.`);
    out[id] = { en: b.str("en", true), ar: b.str("ar", true), phone: b.pick("phone", YN) === 1 };
    b.done();
  }
  return out;
}

/* ---------- tools: one file per tool ---------- */
export function loadTools(dir, cats, plats) {
  const out = [];
  if (!need(dir)) return out;
  const seenName = new Set();
  for (const fname of readdirSync(dir).filter((n) => n.endsWith(".txt") && !n.startsWith("_")).sort()) {
    const file = join(dir, fname), id = basename(fname, ".txt");
    if (!/^[a-z0-9-]+$/.test(id)) { bad(file, 0, "اسم الملف يجب أن يكون حروفًا إنجليزية صغيرة وأرقامًا وشرطة فقط (مثل: my-tool.txt)."); continue; }
    const blocks = parse(file);
    if (blocks.length !== 1) { bad(file, 0, "الملف يجب أن يحتوي أداة واحدة فقط (لا تستخدم --- داخله)."); continue; }
    const b = blocks[0];
    const name = b.str("name", true);
    if (name && seenName.has(name.toLowerCase())) bad(file, b.ln("name"), `الاسم «${name}» مستخدم في أداة أخرى.`);
    seenName.add(name.toLowerCase());
    const cat = b.str("category", true).toLowerCase();
    if (cat && !cats[cat]) bad(file, b.ln("category"), `التصنيف «${cat}» غير موجود في content/categories.txt. الموجود: ${Object.keys(cats).join(", ")}`);
    const website = b.url("website", true), pu = b.url("pricing_page");
    const pl = b.list("platforms", Object.keys(plats));
    const g = b.list("goals", GOALS);
    const l = b.int("level", 1, 3);
    const f = b.pick("free_plan", YNU);
    const o = b.pick("open_source", YN);
    const order = b.int("order", 1, 100000, false);
    const d = b.pair("short", true), w = b.pair("limit", true), d2 = b.pair("long");
    if ((d2[0] && !d2[1]) || (!d2[0] && d2[1])) bad(file, b.ln("long_en"), "الوصف الطويل: اكتب النسختين العربية والإنجليزية معًا (long_en و long_ar) أو اتركهما فارغتين.");

    const checked = b.str("checked"), source = b.url("source"), from = b.str("paid_from");
    const planLines = b.many("plan").filter((x) => x.v);
    let pricing;
    if (checked || source || from || planLines.length) {
      if (!checked || !source || !from || !planLines.length) {
        bad(file, b.ln("checked"), "بيانات التوثيق ناقصة. لتوثيق الأداة املأ الأربعة معًا: checked و source و paid_from وسطر plan واحد على الأقل. وإن لم تتحقق منها بعد فاحذف قيمها كلها واتركها فارغة.");
      } else {
        const dt = new Date(checked + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(checked) || Number.isNaN(+dt)) bad(file, b.ln("checked"), `«checked» تاريخ بالشكل 2026-10-06 (كتبتَ: ${checked})`);
        else if (+dt > Date.now() + 864e5) bad(file, b.ln("checked"), "تاريخ التحقق في المستقبل.");
        const plans = planLines.map((x) => {
          const p = x.v.split("|").map((s) => s.trim());
          if (p.length < 2 || p.length > 3 || !p[0]) bad(file, x.n, "صيغة plan:  الاسم | السعر | ملاحظة   (الملاحظة اختيارية، والسعر قد يُترك فارغًا لكن اترك الفاصلة)");
          return [p[0] || "", p[1] || "", p[2] || ""];
        });
        pricing = { currency: "USD", free: f === 1, from, checked, source, plans };
      }
    }
    b.done();
    const c = cats[cat] || { en: "", ar: "" };
    const t = { id, n: name, c: [c.en, c.ar], u: website, pu: pu || null, pl, g, f: f ?? null, p: pl.some((x) => plats[x] && plats[x].phone) ? 1 : 0, o: o ?? 0, l, d, w };
    if (d2[0]) t.d2 = d2;
    if (pricing) t.pricing = pricing;
    t.status = pricing ? "verified" : "needs_verification";
    t.last_verified = pricing ? pricing.checked : null;
    t.source_url = pricing ? pricing.source : website;
    out.push({ t, order: order ?? 1000 });
  }
  return out.sort((a, b) => a.order - b.order || a.t.n.localeCompare(b.t.n)).map((x) => x.t);
}

/* ---------- collections: one file, records separated by --- ---------- */
const NAMED = (file, fn) => (need(file) ? parse(file).map((b) => { const r = fn(b); b.done(); return r; }) : []);

export const loadMoney = (file) => NAMED(file, (b) => ({
  d: b.pick("difficulty", { beginner: 0, intermediate: 1 }), p: b.pick("phone", YN), cp: b.pick("competition", { medium: 0, high: 1 }),
  n: b.pair("name", true), sk: b.pair("skills", true), mo: b.pair("income", true), rk: b.pair("risk", true), st: b.pair("first_step", true),
}));

export function loadFuture(file) {
  const rows = NAMED(file, (b) => [b.int("year", 2000, 2100), b.pair("axis", true), b.pick("status", { observed: "o", emerging: "e", likely: "l", speculative: "s" }), b.pair("text", true)]);
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r[0] - b.r[0] || a.i - b.i).map((x) => x.r);
}

export function loadSafety(file) {
  const topics = [], policies = [];
  if (!need(file)) return { topics, policies };
  for (const b of parse(file)) {
    const type = b.pick("type", { topic: "topic", policy: "policy" });
    if (type === "policy") policies.push([b.str("name", true), b.url("url", true)]);
    else if (type === "topic") topics.push({ r: b.pick("risk", { medium: 1, high: 2 }), n: b.pair("title", true), a: b.pair("applies", true), t: b.pair("text", true) });
    b.done();
  }
  return { topics, policies };
}

export function loadCareers(file) {
  const seen = new Set();
  return NAMED(file, (b) => {
    const id = b.str("id", true).toLowerCase();
    if (id && seen.has(id)) bad(file, b.at, `الوظيفة «${id}» مكررة.`);
    seen.add(id);
    return { id, x: b.pick("exposure", { low: 0, medium: 1, high: 2 }), n: b.pair("name", true), a: b.pair("assist", true), h: b.pair("human", true), g: b.pair("grow", true) };
  });
}

export function loadAcademy(file) {
  const out = { en: [], ar: [], hours: [] };
  for (const r of NAMED(file, (b) => ({ t: b.pair("title", true), tp: b.pair("topics", true), pj: b.pair("project", true), h: b.str("hours", true) }))) {
    out.en.push([r.t[0], r.tp[0], r.pj[0]]); out.ar.push([r.t[1], r.tp[1], r.pj[1]]); out.hours.push(r.h);
  }
  return out;
}

/* ---------- pages: one file per page; sections can depend on the ads setting ---------- */
const SHOW = ["always", "ads_off", "ads_on", "ads_consent", "ads_open"];
export function loadPages(dir, ads) {
  const pages = {}, order = [];
  if (!need(dir)) return { order, pages };
  const active = !ads.enabled ? ["ads_off"] : ads.consent.required ? ["ads_on", "ads_consent"] : ["ads_on", "ads_open"];
  const rows = [];
  for (const fname of readdirSync(dir).filter((n) => n.endsWith(".txt") && !n.startsWith("_")).sort()) {
    const file = join(dir, fname), slug = basename(fname, ".txt");
    if (!/^[a-z0-9-]+$/.test(slug)) { bad(file, 0, "اسم الملف: حروف إنجليزية صغيرة وأرقام وشرطة فقط (يصبح رابط الصفحة)."); continue; }
    const [meta, ...secs] = parse(file);
    if (!meta) { bad(file, 0, "الملف فارغ."); continue; }
    const t = meta.pair("title", true), d = meta.pair("description", true), ord = meta.int("order", 1, 100000, false), email = meta.pick("show_email", YN, false);
    meta.done();
    const s = [];
    for (const b of secs) {
      const h = b.pair("heading", true), en = b.many("text_en").map((x) => x.v), ar = b.many("text_ar").map((x) => x.v);
      const show = b.str("show_if").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
      for (const x of show) if (!SHOW.includes(x)) bad(file, b.ln("show_if"), `show_if «${x}» غير معروف. المسموح: ${SHOW.join(" / ")}`);
      if (!en.length || en.length !== ar.length) bad(file, b.at, `القسم «${h[0]}»: عدد الفقرات text_en (${en.length}) يجب أن يساوي عدد text_ar (${ar.length}) وألا يقل عن واحدة.`);
      if (en.some((x) => !x) || ar.some((x) => !x)) bad(file, b.at, `القسم «${h[0]}»: توجد فقرة فارغة.`);
      b.done();
      if (!show.length || show.includes("always") || show.some((x) => active.includes(x))) s.push({ h, p: en.map((x, i) => [x, ar[i]]) });
    }
    rows.push({ slug, ord: ord ?? 1000, page: { t, d, s, email: email === 1 } });
  }
  rows.sort((a, b) => a.ord - b.ord || a.slug.localeCompare(b.slug));
  for (const r of rows) { order.push(r.slug); pages[r.slug] = r.page; }
  return { order, pages };
}

/* ---------- ads + site ---------- */
export function loadAds(file) {
  const ads = { enabled: false, consent: { required: true }, label: { en: "Advertisement", ar: "إعلان" }, slots: {}, cspAllow: [] };
  if (!need(file)) return ads;
  const [g, ...slots] = parse(file);
  if (!g) return ads;
  ads.enabled = g.pick("enabled", YN) === 1;
  ads.consent = { required: g.pick("consent_required", YN) === 1 };
  const [le, la] = g.pair("label", true);
  ads.label = { en: le, ar: la };
  ads.cspAllow = g.str("allow_domains").split(",").map((s) => s.trim()).filter(Boolean);
  for (const x of ads.cspAllow) if (!/^https:\/\/[\w.*-]+(:\d+)?$/.test(x)) bad(file, g.ln("allow_domains"), `«${x}» ليس نطاقًا صحيحًا. الشكل: https://example.com (بدون مسار).`);
  g.done();
  for (const b of slots) {
    const id = b.str("slot", true);
    if (id && !ADS_SLOTS.includes(id)) bad(file, b.ln("slot"), `الموضع «${id}» غير موجود. المواضع: ${ADS_SLOTS.join(", ")}`);
    if (ads.slots[id]) bad(file, b.at, `الموضع «${id}» مكتوب مرتين.`);
    const enabled = b.pick("enabled", YN) === 1, type = b.pick("type", { adsense: "adsense", image: "image", html: "html" });
    const s = {
      enabled, type,
      adsense: { client: b.str("adsense_client"), slot: b.str("adsense_slot"), format: b.str("adsense_format") || "auto" },
      image: { src: b.url("image_src"), href: b.url("image_href"), alt: b.str("image_alt"), width: b.int("image_width", 1, 3000, false) ?? 0, height: b.int("image_height", 1, 3000, false) ?? 0 },
      html: b.str("html"),
    };
    b.done();
    if (enabled) {
      if (type === "adsense" && !(/^ca-pub-\d+$/.test(s.adsense.client) && /^\d+$/.test(s.adsense.slot))) bad(file, b.at, `الموضع «${id}»: نوع adsense يحتاج adsense_client بالشكل ca-pub-123… و adsense_slot أرقامًا فقط.`);
      if (type === "image" && !(s.image.src && s.image.href)) bad(file, b.at, `الموضع «${id}»: نوع image يحتاج image_src و image_href (https://).`);
      if (type === "html" && !s.html) bad(file, b.at, `الموضع «${id}»: نوع html يحتاج الكود في الحقل html.`);
    }
    ads.slots[id] = s;
  }
  return ads;
}

export function loadSite(file) {
  const site = { contactEmail: "", name: "", description: ["", ""], themeColor: "#080A0F" };
  if (!need(file)) return site;
  const [b] = parse(file);
  if (b) {
    site.name = b.str("site_name", true);
    site.description = b.pair("description", true);
    site.themeColor = b.str("theme_color") || site.themeColor;
    if (!/^#[0-9a-fA-F]{6}$/.test(site.themeColor)) bad(file, b.ln("theme_color"), "«theme_color» لون بالشكل #080A0F");
    site.contactEmail = b.str("contact_email");
    if (site.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(site.contactEmail)) bad(file, b.ln("contact_email"), `«${site.contactEmail}» ليس بريدًا إلكترونيًا صحيحًا.`);
    b.done();
  }
  return site;
}

/* ---------- interface texts: every visible label/title/button text, in both languages ----------
   Lines look like   key_en: ...   and   key_ar: ...   (lists use .0 .1 ..., groups use a.b). */
export function loadUi(files, required = []) {
  const flat = { en: {}, ar: {} }, where = {}, fn = {};
  for (const file of files) {
    for (const b of parse(file, true)) {
      for (const l of b.lines) {
        const m = l.k.match(/^(.*)_(en|ar)$/);
        if (m) {
          if (m[1] in flat[m[2]]) bad(file, l.n, `المفتاح «${l.k}» مكرر.`);
          flat[m[2]][m[1]] = l.v; where[m[1]] = where[m[1]] || [file, l.n];
        } else if (l.k.endsWith("._fn")) {
          if (!/^\d+$/.test(l.v)) bad(file, l.n, "قيمة _fn رقم صحيح (عدد المتغيرات) — لا تغيّرها.");
          fn[l.k.slice(0, -4)] = Number(l.v);
        } else bad(file, l.n, `المفتاح «${l.k}» يجب أن ينتهي بـ _en (الإنجليزية) أو _ar (العربية).`);
      }
    }
  }
  for (const k of new Set([...Object.keys(flat.en), ...Object.keys(flat.ar)])) {
    const [f, n] = where[k];
    if (!(k in flat.en)) bad(f, n, `ينقص السطر الإنجليزي «${k}_en» (لكل نص نسختان).`);
    if (!(k in flat.ar)) bad(f, n, `ينقص السطر العربي «${k}_ar» (لكل نص نسختان).`);
  }
  for (const r of required) if (!(r in flat.en)) bad("content/ui", 0, `نص مطلوب للموقع مفقود: «${r}». أعده (أنشأه الموقع في الأصل، ولا يجوز حذفه).`);
  const put = (root, path, value) => {
    const seg = path.split("."); let o = root;
    seg.forEach((x, i) => { if (i === seg.length - 1) o[x] = value; else o = o[x] ??= /^\d+$/.test(seg[i + 1]) ? [] : {}; });
  };
  const out = { en: {}, ar: {} };
  for (const lang of ["en", "ar"]) {
    for (const [k, v] of Object.entries(flat[lang])) put(out[lang], k, v);
    for (const [k, n] of Object.entries(fn)) put(out[lang], k + "._fn", n);
  }
  return out;
}
