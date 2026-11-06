import type { ReactNode } from "react";
import AdSlot from "@/components/AdSlot";
import GlobalDock from "@/components/GlobalDock";
import { UI, isLang, type Lang } from "@/lib/i18n";
import { TOOLS } from "@/lib/tools";

/** Texts of the floating dock only (search, focus bar, stash) plus the names the search needs. */
const dockUi = (lang: Lang): Record<string, string> =>
  Object.fromEntries(Object.entries(UI[lang]).filter(([k, v]) => typeof v === "string" && /^(dk|st|hbT_|hbD_|hbM_|hbNav|hbClose|hbCopy|hbCopied|cvNav)/.test(k)));

export default async function LangLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return <>{children}</>;
  return (
    <>
      <GlobalDock lang={lang} ui={dockUi(lang)} aiTools={TOOLS.map((t): [string, string] => [t.id, t.n])} stashAd={<AdSlot id="tool-sidebar" lang={lang} />} />
      {children}
    </>
  );
}
