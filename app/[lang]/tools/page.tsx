import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import Shell from "@/components/Shell";
import AdSlot from "@/components/AdSlot";
import { LANGS, UI, isLang } from "@/lib/i18n";
import { TOOLS, pick } from "@/lib/tools";

export const dynamicParams = false;
type P = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    title: UI[lang].toolsH,
    description: UI[lang].toolsLead,
    alternates: { canonical: `/${lang}/tools`, languages: { en: "/en/tools", ar: "/ar/tools", "x-default": "/en/tools" } },
  };
}

export default async function ToolsIndex({ params }: P) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const u = UI[lang];
  return (
    <Shell lang={lang} alt={`/${lang === "en" ? "ar" : "en"}/tools`}>
      <h1>{u.toolsH}</h1>
      <p className="lead">{u.toolsLead}</p>
      <ul className="grid">
        {TOOLS.map((t, i) => (<Fragment key={t.id}>
          <li key={t.id} className="card">
            <h2><Link href={`/${lang}/tools/${t.id}`}>{t.n}</Link></h2>
            <span className="tag">{pick(t.c, lang)}</span>
            <span className={`tag ${t.status === "verified" ? "ok" : "wn"}`}>{t.status === "verified" ? u.ver : u.unv}</span>
            <p>{pick(t.d, lang)}</p>
          </li>
          {i === 5 && <li className="adli"><AdSlot id="tools-index-inline" lang={lang} /></li>}
          </Fragment>
        ))}
      </ul>
    </Shell>
  );
}
