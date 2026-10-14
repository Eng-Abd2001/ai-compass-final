// Build step (runs before dev / build / check). Reads the simple-text files in /content, validates them,
// writes the generated data used by the site, a verification report, and public/index.html.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import * as C from "./content.mjs";

const e = process.env;
const site = (e.NEXT_PUBLIC_SITE_URL || (e.VERCEL_PROJECT_PRODUCTION_URL ? `https://${e.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
const R = "content/";

/* ---------- 1) read + validate everything (all errors are reported together, in Arabic) ---------- */
const cats = C.loadCategories(R + "categories.txt");
const plats = C.loadPlatforms(R + "platforms.txt");
const tools = C.loadTools(R + "tools", cats, plats);
const ads = C.loadAds(R + "ads.txt");
const safety = C.loadSafety(R + "safety.txt");
const content = {
  money: C.loadMoney(R + "money.txt"), future: C.loadFuture(R + "future.txt"), safe: safety.topics, policies: safety.policies,
  careers: C.loadCareers(R + "careers.txt"), academy: C.loadAcademy(R + "academy.txt"),
  platforms: { en: Object.fromEntries(Object.entries(plats).map(([k, v]) => [k, v.en])), ar: Object.fromEntries(Object.entries(plats).map(([k, v]) => [k, v.ar])) },
};
const pages = C.loadPages(R + "pages", ads);
const siteCfg = C.loadSite(R + "site.txt");
const uiKeys = JSON.parse(readFileSync("scripts/ui-keys.json", "utf8"));
const uiHome = C.loadUi(readdirSync(R + "ui/home").filter((n) => n.endsWith(".txt") && !n.startsWith("_")).sort().map((n) => R + "ui/home/" + n), uiKeys.home);
const uiPages = C.loadUi([R + "ui/pages.txt"], uiKeys.pages);
try { C.throwIfErrors(); } catch (e) { console.error(e.message); process.exit(1); }
if (!tools.length) throw new Error("لا توجد أدوات في content/tools");

/* ---------- 2) generated data ---------- */
mkdirSync("data", { recursive: true });
const adsPublic = { enabled: ads.enabled, consent: ads.consent, label: ads.label, slots: ads.slots };
const out = (f, v) => writeFileSync("data/" + f, JSON.stringify(v, null, 1));
out("tools.json", tools); out("content.generated.json", content); out("pages.generated.json", pages);
out("ads.generated.json", adsPublic); out("site.generated.json", siteCfg); out("ui.generated.json", { home: uiHome, pages: uiPages });

/* ---------- 3) verification report ---------- */
const today = new Date(), age = (d) => Math.floor((today - new Date(d + "T00:00:00Z")) / 864e5);
const done = tools.filter((t) => t.status === "verified"), todo = tools.filter((t) => t.status !== "verified");
const stale = done.filter((t) => age(t.pricing.checked) > C.STALE_DAYS);
const report = [`# تقرير التوثيق (يُولَّد تلقائيًا عند كل  npm run check)`, "",
  `- أدوات موثّقة: **${done.length} من ${tools.length}**`, `- تحتاج توثيقًا: **${todo.length}**`, `- موثّقة لكنها أقدم من ${C.STALE_DAYS} يومًا (أعد فحصها): **${stale.length}**`, "",
  "## تحتاج توثيقًا", "", "| الأداة | ملفها | صفحة الأسعار | ملاحظة التوثيق |", "|---|---|---|---|", ...todo.map((t) => `| ${t.n} | content/tools/${t.id}.txt | ${t.pu || "—"} | ${(readFileSync(R + "tools/" + t.id + ".txt", "utf8").match(/^# محاولة التوثيق[^:]*:\s*(.*)$/m) || [, "لم تُجرَّب بعد"])[1]} |`), "",
  `## موثّقة قديمة (> ${C.STALE_DAYS} يومًا)`, "", ...(stale.length ? stale.map((t) => `- ${t.n}: فُحصت في ${t.pricing.checked} (${age(t.pricing.checked)} يومًا)`) : ["لا شيء."]), ""];
writeFileSync(R + "VERIFICATION-REPORT.md", report.join("\n"));

/* ---------- 4) static page ---------- */
const src = readFileSync("site/index.html", "utf8");
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const links = [
  `<a href="/en/tools">${uiPages.en.tools}</a>`, `<a href="/ar/tools" lang="ar" dir="rtl">${uiPages.ar.tools}</a>`,
  ...tools.map((t) => `<a href="/en/tools/${t.id}">${t.n}</a>`),
  ...pages.order.map((s) => `<a href="/en/${s}">${pages.pages[s].t[0]}</a>`),
  ...pages.order.map((s) => `<a href="/ar/${s}" lang="ar" dir="rtl">${pages.pages[s].t[1]}</a>`),
].join("\n");
mkdirSync("public", { recursive: true });
writeFileSync("public/index.html", src.replaceAll("%SITE_URL%", site).replaceAll("%TOOL_LINKS%", links)
  .replaceAll("%TOOLS_JSON%", json(tools)).replaceAll("%CONTENT_JSON%", json(content)).replaceAll("%ADS_JSON%", json(adsPublic)).replaceAll("%UI_JSON%", json(uiHome))
  .replaceAll("%SITE_NAME%", esc(siteCfg.name)).replaceAll("%DOC_TITLE%", esc(uiHome.en.docTitle)).replaceAll("%DESC_EN%", esc(siteCfg.description[0])).replaceAll("%THEME%", siteCfg.themeColor));

console.log(`✅ المحتوى سليم: ${tools.length} أداة (${done.length} موثّقة، ${todo.length} تحتاج توثيقًا${stale.length ? `، ${stale.length} موثّقة قديمة` : ""}) | ${pages.order.length} صفحات | الإعلانات: ${ads.enabled ? "مفعّلة" : "متوقفة"}`);
console.log(`   التقرير: content/VERIFICATION-REPORT.md`);
