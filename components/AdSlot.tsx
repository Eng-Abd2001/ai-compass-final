import { ADS, slotConf } from "@/lib/ads";
import type { Lang } from "@/lib/i18n";
import { AdClient } from "./AdClient";

/** Renders the ad configured for slot `id` in data/ads.jsonc. Renders nothing when ads or the slot are off. */
export default function AdSlot({ id, lang }: { id: string; lang: Lang }) {
  const conf = slotConf(id);
  if (!conf || !conf.enabled) return null;
  return <AdClient conf={conf} label={ADS.label[lang]} required={!!ADS.consent?.required} />;
}
