import Link from "next/link";
import { PAGES, SLUGS } from "@/lib/legal";
import { UI, dirOf, type Lang } from "@/lib/i18n";
import { ADS } from "@/lib/ads";
import { SITE_NAME } from "@/lib/site";
import { ConsentBar } from "@/components/AdClient";

export default function Shell({ lang, alt, children }: { lang: Lang; alt: string; children: React.ReactNode }) {
  const u = UI[lang];
  const other: Lang = lang === "en" ? "ar" : "en";
  const i = lang === "en" ? 0 : 1;
  return (
    <div lang={lang} dir={dirOf(lang)} className="shell">
      <header className="hd">
        <a className="logo" href="/">{SITE_NAME}</a>
        <nav aria-label={u.ariaMain}>
          <Link href={`/${lang}/tools`}>{u.tools}</Link>
          <Link href={alt} hrefLang={other} lang={other}>{UI[other].lang}</Link>
        </nav>
      </header>
      <main className="pg">{children}</main>
      {ADS.enabled && ADS.consent?.required && <ConsentBar text={u.consentText} yes={u.consentYes} no={u.consentNo} />}
      <footer className="ft">
        <nav aria-label={u.ariaFooter}>
          <a href="/">{u.home}</a>
          {SLUGS.map((s) => <Link key={s} href={`/${lang}/${s}`}>{PAGES[s].t[i]}</Link>)}
        </nav>
      </footer>
    </div>
  );
}
