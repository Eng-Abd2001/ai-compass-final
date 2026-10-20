// @ts-nocheck
import PromptsVaultClient from "@/components/PromptsVaultClient";
import { PROMPTS } from "@/data/prompts";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ar" }];
}

export async function generateMetadata({ params }: any) {
  const p = await Promise.resolve(params);
  const lang = p?.lang === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const title = isAr
    ? "مختبر البرومبتات الخارقة — 50 أمر توليد صور احترافي | AI Compass"
    : "Avant-Garde Prompt Vault — 50 Next-Gen AI Image Prompts | AI Compass";
  const description = isAr
    ? "مكتبة تفاعلية تضم 50 برومبت هندسي غير مسبوق لتوليد الصور بالذكاء الاصطناعي (Midjourney, Leonardo, Flux) مع تخصيص فوري للعدسات والإضاءة والأبعاد."
    : "Interactive vault of 50 optically engineered AI image prompts for Midjourney, Flux, and Leonardo AI with live variable customization and aspect ratio controls.";
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/prompts`,
      languages: { ar: "/ar/prompts", en: "/en/prompts" }
    },
    openGraph: { title, description, type: "website" }
  };
}

export default async function PromptsPage({ params }: any) {
  const p = await Promise.resolve(params);
  const lang = p?.lang === "ar" ? "ar" : "en";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "ar" ? "مختبر البرومبتات الخارقة (50 برومبت)" : "Avant-Garde AI Prompt Vault (50 Prompts)",
    numberOfItems: PROMPTS.length,
    itemListElement: PROMPTS.slice(0, 15).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: lang === "ar" ? item.arT : item.enT,
      description: lang === "ar" ? item.arC : item.enC
    }))
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PromptsVaultClient lang={lang} />
    </main>
  );
}
