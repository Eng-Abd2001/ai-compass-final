import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import AdSlot from "@/components/AdSlot";
import InteractiveHubClient from "@/components/InteractiveHubClient";
import { LANGS, UI, isLang, type Lang } from "@/lib/i18n";
import { HUB_TOOLS } from "@/lib/hub/registry";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
    title: u.hbH,
    description: u.hbDesc,
    alternates: { canonical: `/${lang}/hub`, languages: { en: "/en/hub", ar: "/ar/hub", "x-default": "/en/hub" } },
    openGraph: { title: u.hbH, description: u.hbDesc, type: "website", url: `/${lang}/hub`, siteName: SITE_NAME, locale: lang === "ar" ? "ar_AR" : "en_US", alternateLocale: lang === "ar" ? "en_US" : "ar_AR" },
    twitter: { card: "summary", title: u.hbH, description: u.hbDesc },
  };
}

/** The tools need their own labels (hb*), the picture-privacy field names (cvX_*) and the shared copy/pin words. */
const hubUi = (lang: Lang): Record<string, string> =>
  Object.fromEntries(Object.entries(UI[lang]).filter(([k, v]) => typeof v === "string" && /^(hb|cvX_)/.test(k)));

export default async function HubPage({ params }: P) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const u = UI[lang];
  const base = `${SITE_URL}/${lang}`;
  const ld = [
    {
      "@context": "https://schema.org", "@type": "ItemList", name: u.hbH, description: u.hbDesc, url: `${base}/hub`, inLanguage: lang, numberOfItems: HUB_TOOLS.length,
      itemListElement: HUB_TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/hub#${t.id}`, name: u[`hbT_${t.id}`], description: u[`hbD_${t.id}`] })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [[u.home, `${SITE_URL}/`], [u.hbNav, `${base}/hub`]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
    },
  ];
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return (
    <Shell lang={lang} alt={`/${lang === "en" ? "ar" : "en"}/hub`} wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <div className="hb-hero">
        <h1>{u.hbH}</h1>
        <p className="lead">{u.hbLead}</p>
        <ul className="cv-chips">{[u.hbChip1, u.hbChip2, u.hbChip3].map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      <AdSlot id="after-hero" lang={lang} />
      <InteractiveHubClient
        lang={lang}
        ui={hubUi(lang)}
        sponsored={<AdSlot id="tools-grid-native" lang={lang} />}
        modalAd={<AdSlot id="tool-after-intro" lang={lang} />}
      />
      <section className="cv-info" aria-labelledby="hb-know">
        <h2 id="hb-know">{u.hbSecKnow}</h2>
        <p>{u.hbKnow}</p>
      </section>
      <section className="cv-info" aria-labelledby="hb-next">
        <h2 id="hb-next">{u.hbNextTitle}</h2>
        <div className="cv-next">
          <Link className="chipbtn" href={`/${lang}/convert`}>{u.cvNav}</Link>
          <Link className="chipbtn" href={`/${lang}/tools`}>{u.pvBackTools}</Link>
        </div>
      </section>
      <AdSlot id="before-footer" lang={lang} />
    </Shell>
  );
}
