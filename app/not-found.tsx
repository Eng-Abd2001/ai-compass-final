import { UI } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

export default function NotFound() {
  return (
    <main style={{ padding: "20vh 24px", textAlign: "center" }}>
      <h1>{UI.en.nfTitle}</h1>
      <p>{UI.en.nfText}</p>
      <p lang="ar" dir="rtl">{UI.ar.nfText}</p>
      <a href="/" className="ext">{SITE_NAME}</a>
    </main>
  );
}
