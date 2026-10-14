import raw from "@/data/ads.generated.json";

/** Generated from data/ads.jsonc by scripts/build-html.mjs. Ads are configured ONLY in that file. */
export type AdConf = {
  enabled: boolean; type: "adsense" | "image" | "html";
  adsense?: { client: string; slot: string; format?: string };
  image?: { src: string; href: string; alt?: string; width?: number; height?: number };
  html?: string;
};
export type Ads = { enabled: boolean; consent?: { required: boolean }; label: { en: string; ar: string }; slots: Record<string, AdConf> };
export const ADS = raw as unknown as Ads;
export const slotConf = (id: string): AdConf | undefined => (ADS.enabled ? ADS.slots[id] : undefined);
