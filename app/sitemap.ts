import type { MetadataRoute } from "next";
import { SLUGS } from "@/lib/legal";
import { LANGS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

const alt = (path: string) => ({
  languages: Object.fromEntries([...LANGS.map((l) => [l, `${SITE_URL}/${l}${path}`]), ["x-default", `${SITE_URL}/en${path}`]]),
});

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: "https://ai-compass-murex-mu.vercel.app/ar/prompts", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://ai-compass-murex-mu.vercel.app/en/prompts", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...LANGS.map((l) => ({ url: `${SITE_URL}/${l}/tools`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8, alternates: alt("/tools") })),
    ...TOOLS.flatMap((t) =>
      LANGS.map((l) => ({ url: `${SITE_URL}/${l}/tools/${t.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6, alternates: alt(`/tools/${t.id}`) }))
    ),
    ...SLUGS.flatMap((s) =>
      LANGS.map((l) => ({ url: `${SITE_URL}/${l}/${s}`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3, alternates: alt(`/${s}`) }))
    ),
  ];
}
