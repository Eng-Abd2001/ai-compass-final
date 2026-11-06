import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import AdSlot from "@/components/AdSlot";
import ConvertClient from "@/components/ConvertClient";
import { LANGS, UI, isLang, type Lang } from "@/lib/i18n";
import { GROUPS, ROUTES, fromNames } from "@/lib/convert/routes";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamicParams = false;
type P = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const u = UI[lang];
  return {
    title: u.cvH,
    description: u.cvDesc,
    alternates: { canonical: `/${lang}/convert`, languages: { en: "/en/convert", ar: "/ar/convert", "x-default": "/en/convert" } },
    openGraph: {
      title: u.cvH, description: u.cvDesc, type: "website", url: `/${lang}/convert`, siteName: SITE_NAME,
      locale: lang === "ar" ? "ar_AR" : "en_US", alternateLocale: lang === "ar" ? "en_US" : "ar_AR",
    },
    twitter: { card: "summary", title: u.cvH, description: u.cvDesc },
  };
}

/** The workbench only needs its own labels; the long SEO texts stay on the server. */
const SERVER_ONLY = /^cv((Q|A|F)\d|S_|How\d|Limits$|T_|Next|H$|Lead$|Desc$|Chip\d|Nav$)/;
const workbenchUi = (lang: Lang): Record<string, string> =>
  Object.fromEntries(Object.entries(UI[lang]).filter(([k, v]) => k.startsWith("cv") && typeof v === "string" && !SERVER_ONLY.test(k)));

const NEXT_TOOLS = ["photoroom", "canva", "firefly"];

export default async function ConvertPage({ params }: P) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const u = UI[lang];
  const base = `${SITE_URL}/${lang}`;
  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({ q: u[`cvQ${n}`], a: u[`cvA${n}`] }));
  const next = NEXT_TOOLS.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is (typeof TOOLS)[number] => !!t);
  const ld = [
    {
      "@context": "https://schema.org", "@type": "WebApplication",
      name: u.cvNav, description: u.cvDesc, url: `${base}/convert`, inLanguage: lang,
      applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ROUTES.map((r) => `${fromNames(r)} → ${u[`cvr_${r.id.replace(/-/g, "_")}`]}`),
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [[u.home, `${SITE_URL}/`], [u.cvNav, `${base}/convert`]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
    },
  ];
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return (
    <Shell lang={lang} alt={`/${lang === "en" ? "ar" : "en"}/convert`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <h1>{u.cvH}</h1>
      <p className="lead">{u.cvLead}</p>
      <ul className="cv-chips">
        {[u.cvChip1, u.cvChip2, u.cvChip3].map((c) => <li key={c}>{c}</li>)}
      </ul>
      <AdSlot id="after-hero" lang={lang} />
      <ConvertClient lang={lang} ui={workbenchUi(lang)} />
      <AdSlot id="tools-index-inline" lang={lang} />

      <section className="cv-info" aria-labelledby="cv-how">
        <h2 id="cv-how">{u.cvS_how}</h2>
        <ol className="cv-steps">{[1, 2, 3].map((n) => <li key={n}>{u[`cvHow${n}`]}</li>)}</ol>
      </section>

      <section className="cv-info" aria-labelledby="cv-feat">
        <h2 id="cv-feat">{u.cvS_feat}</h2>
        <div className="cv-feats">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <article key={n} className="cv-feat"><h3>{u[`cvF${n}t`]}</h3><p>{u[`cvF${n}d`]}</p></article>
          ))}
        </div>
      </section>

      <AdSlot id="between-sections" lang={lang} />

      <section className="cv-info" aria-labelledby="cv-table">
        <h2 id="cv-table">{u.cvS_table}</h2>
        <div className="cv-tbl-wrap">
          <table className="cv-tbl">
            <thead><tr><th scope="col">{u.cvT_from}</th><th scope="col">{u.cvT_to}</th></tr></thead>
            {GROUPS.map((g) => (
              <tbody key={g}>
                <tr className="cv-tbl-g"><th scope="colgroup" colSpan={2}>{u[`cvG_${g}`]}</th></tr>
                {ROUTES.filter((r) => r.group === g).map((r) => (
                  <tr key={r.id}>
                    <td dir="ltr">{fromNames(r)}</td>
                    <td>{u[`cvr_${r.id.replace(/-/g, "_")}`]}<small> — {u[`cvd_${r.id.replace(/-/g, "_")}`]}</small></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="cv-hint">* {u.cvT_heic}</p>
      </section>

      <section className="cv-info" aria-labelledby="cv-limits">
        <h2 id="cv-limits">{u.cvS_limits}</h2>
        <p>{u.cvLimits}</p>
      </section>

      <section className="cv-info" aria-labelledby="cv-faq">
        <h2 id="cv-faq">{u.cvS_faq}</h2>
        <div className="cv-faq">
          {faq.map((f) => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
      </section>

      <section className="cv-info" aria-labelledby="cv-next">
        <h2 id="cv-next">{u.cvS_next}</h2>
        <p>{u.cvNextLead}</p>
        <div className="cv-next">
          {next.map((t) => <Link key={t.id} className="chipbtn" href={`/${lang}/tools/${t.id}`}>{t.n}</Link>)}
          <Link className="chipbtn" href={`/${lang}/tools`}>{u.pvBackTools}</Link>
        </div>
      </section>

      <AdSlot id="before-footer" lang={lang} />
    </Shell>
  );
}
