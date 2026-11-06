import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import AdPrefs from "@/components/AdPrefs";
import { ADS } from "@/lib/ads";
import { PAGES, SLUGS, isSlug } from "@/lib/legal";
import { LANGS, UI, isLang } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";

export const dynamicParams = false;
type P = { params: Promise<{ lang: string; page: string }> };
const idx = (l: string) => (l === "ar" ? 1 : 0);

export function generateStaticParams() {
  return LANGS.flatMap((lang) => SLUGS.map((page) => ({ lang, page })));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, page } = await params;
  if (!isLang(lang) || !isSlug(page)) return {};
  const p = PAGES[page];
  return {
    title: p.t[idx(lang)],
    description: p.d[idx(lang)],
    alternates: { canonical: `/${lang}/${page}`, languages: { en: `/en/${page}`, ar: `/ar/${page}`, "x-default": `/en/${page}` } },
  };
}

export default async function LegalPage({ params }: P) {
  const { lang, page } = await params;
  if (!isLang(lang) || !isSlug(page)) notFound();
  const i = idx(lang);
  const p = PAGES[page];
  const email = CONTACT_EMAIL;
  return (
    <Shell lang={lang} alt={`/${lang === "en" ? "ar" : "en"}/${page}`}>
      <h1>{p.t[i]}</h1>
      <p className="lead">{p.d[i]}</p>
      {p.s.map((s) => (
        <section key={s.h[0]}>
          <h2>{s.h[i]}</h2>
          {s.p.map((x) => <p key={x[0]}>{x[i]}</p>)}
        </section>
      ))}
      {page === "privacy" && ADS.enabled && ADS.consent?.required && <AdPrefs lang={lang} />}
      {p.email &&
        (email ? (
          <p><a className="ext" href={`mailto:${email}`}>{email}</a></p>
        ) : (
          <p className="small">{UI[lang].contactMissing}</p>
        ))}
    </Shell>
  );
}
