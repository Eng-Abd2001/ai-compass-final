"use client";

/** "Change ad choice": forgets the saved consent so the consent bar asks again. */
export default function AdPrefs({ lang }: { lang: "en" | "ar" }) {
  const reset = () => { try { localStorage.removeItem("aic_ads"); } catch {} window.location.reload(); };
  return <p><button className="chipbtn" onClick={reset}>{lang === "ar" ? "تغيير خيار الإعلانات" : "Change ad choice"}</button></p>;
}
