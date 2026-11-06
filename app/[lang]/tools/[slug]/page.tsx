import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import AdSlot from "@/components/AdSlot";
import { GOALS, LANGS, LEVELS, PLATFORMS, UI, isLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { TOOLS, alternatives, getTool, pick } from "@/lib/tools";

export const dynamicParams = false;
type P = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return LANGS.flatMap((lang) => TOOLS.map((t) => ({ lang, slug: t.id })));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  const t = getTool(slug);
  if (!isLang(lang) || !t) return {};
  const title = `${t.n}: ${UI[lang].profile}`;
  return {
    title,
    description: pick(t.d, lang),
    alternates: {
      canonical: `/${lang}/tools/${slug}`,
      languages: { en: `/en/tools/${slug}`, ar: `/ar/tools/${slug}`, "x-default": `/en/tools/${slug}` },
    },
    openGraph: { title, description: pick(t.d, lang), type: "website", locale: lang === "ar" ? "ar" : "en" },
  };
}

export default async function ToolPage({ params }: P) {
  const { lang, slug } = await params;
  const t = getTool(slug);
  if (!isLang(lang) || !t) notFound();
  const u = UI[lang];
  const yn = (v: number) => (v ? u.yes : u.no);
  const base = `${SITE_URL}/${lang}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: t.n, applicationCategory: t.c[0], description: pick(t.d, lang), url: t.u, inLanguage: lang },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [[u.home, `${SITE_URL}/`], [u.tools, `${base}/tools`], [t.n, `${base}/tools/${t.id}`]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
    },
  ];
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return (
    <Shell lang={lang} alt={`/${lang === "en" ? "ar" : "en"}/tools/${t.id}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <div className="two"><div>
      <p className="small"><Link href={`/${lang}/tools`}>{u.all}</Link></p>
      <h1>{t.n}</h1>
      <span className="tag">{pick(t.c, lang)}</span>
      <p className="lead">{pick(t.d2 ?? t.d, lang)}</p>

      <h2>{u.bestFor}</h2>
      <div>{t.g.map((g) => <span className="tag" key={g}>{GOALS[lang][g] ?? g}</span>)}</div>

      <AdSlot id="tool-after-intro" lang={lang} />

      <h2>{u.facts}</h2>
      <dl className="fl">
        <dt>{u.free}</dt><dd>{t.f == null ? u.nv : yn(t.f)}</dd>
        <dt>{u.platforms}</dt><dd>{t.pl.map((k) => PLATFORMS[lang][k] ?? k).join(", ")}</dd>
        <dt>{u.phone}</dt><dd>{yn(t.p)}</dd>
        <dt>{u.oss}</dt><dd>{yn(t.o)}</dd>
        <dt>{u.level}</dt><dd>{LEVELS[lang][t.l - 1]}</dd>
        <dt>{u.pricing}</dt>
        <dd>{t.pricing ? t.pricing.plans.map((p) => <span key={p[0]} style={{ display: "block" }}>{p.filter(Boolean).join(" · ")}</span>) : u.unv}{t.pu && (<> · <a className="ext" href={t.pu} target="_blank" rel="noopener noreferrer">{u.pricingPage}</a></>)}</dd>
        <dt>{u.limit}</dt><dd>{pick(t.w, lang)}</dd>
      </dl>
      <p className="small">{u.note}</p>

      <h2>{u.alts}</h2>
      <div className="chips">
        {alternatives(t).map((o) => <Link key={o.id} href={`/${lang}/tools/${o.id}`}>{o.n}</Link>)}
      </div>

      <h2>{u.trust}</h2>
      <p>
        <span className={`tag ${t.status === "verified" ? "ok" : "wn"}`}>{t.status === "verified" ? u.ver : u.unv}</span>
        <span className="tag">{u.last}: {t.last_verified ?? u.nv}</span>
      </p>
      <p><a className="ext" href={t.source_url} target="_blank" rel="noopener noreferrer">{u.official}</a></p>

      <h2>{u.how}</h2>
      <p className="small">{u.crit}</p>
    </div><aside className="side"><AdSlot id="tool-sidebar" lang={lang} /></aside></div>
    </Shell>
  );
}
