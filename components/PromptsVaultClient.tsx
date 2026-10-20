// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { PROMPTS, CATEGORIES, type PromptItem } from "@/data/prompts";
import AdSlot from "@/components/AdSlot";

const RATIOS = [
  { id: "--ar 9:16", labelAr: "9:16 (ريلز / ستوري)", labelEn: "9:16 (Reels / Shorts)" },
  { id: "--ar 16:9", labelAr: "16:9 (سينمائي / يوتيوب)", labelEn: "16:9 (Cinematic)" },
  { id: "--ar 1:1", labelAr: "1:1 (مربع)", labelEn: "1:1 (Square)" },
  { id: "--ar 4:5", labelAr: "4:5 (بورتريه)", labelEn: "4:5 (Portrait)" }
];

export default function PromptsVaultClient({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar";
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState<string>("");
  const [ratio, setRatio] = useState<string>("--ar 9:16");
  const [rawMode, setRawMode] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customVars, setCustomVars] = useState<Record<string, { v1?: string; v2?: string }>>({});

  const filtered = useMemo(() => {
    return PROMPTS.filter((p) => {
      if (cat !== "all" && p.cat !== cat) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        p.arT.toLowerCase().includes(s) ||
        p.enT.toLowerCase().includes(s) ||
        p.arC.toLowerCase().includes(s) ||
        p.enC.toLowerCase().includes(s) ||
        p.prompt.toLowerCase().includes(s)
      );
    });
  }, [cat, q]);

  const buildFinalPrompt = (p: PromptItem) => {
    const cv = customVars[p.id] || {};
    const val1 = (cv.v1 !== undefined ? cv.v1 : p.v1[2]) || p.v1[2];
    const val2 = (cv.v2 !== undefined ? cv.v2 : p.v2[2]) || p.v2[2];
    let text = p.prompt.replace("[VAR1]", val1).replace("[VAR2]", val2);
    const tail = [ratio, rawMode ? "--v 6.1 --style raw --q 2" : ""].filter(Boolean).join(" ");
    return text + (tail ? " " + tail : "");
  };

  const copyPrompt = async (p: PromptItem) => {
    const finalStr = buildFinalPrompt(p);
    try {
      await navigator.clipboard.writeText(finalStr);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = finalStr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((prev) => (prev === p.id ? null : prev)), 2200);
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 16px 64px" }} dir={isAr ? "rtl" : "ltr"}>
      {/* Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(107,124,255,0.14), rgba(154,123,255,0.06))",
        border: "1px solid rgba(107,124,255,0.28)",
        borderRadius: 24,
        padding: "clamp(20px, 4vw, 36px)",
        marginBottom: 24,
        textAlign: "center"
      }}>
        <span style={{
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: 999,
          background: "rgba(107,124,255,0.18)",
          color: "#9A7BFF",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 12
        }}>
          {isAr ? "✨ إصدار حصري — 50 أمر هندسي قابل للتخصيص الفوري" : "✨ Exclusive Vault — 50 Customizable Engineered Prompts"}
        </span>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", margin: "0 0 12px", lineHeight: 1.2 }}>
          {isAr ? "مختبر البرومبتات الخارقة للصور" : "Avant-Garde AI Image Prompt Vault"}
        </h1>
        <p style={{ color: "var(--mu, #94a3b8)", maxWidth: 720, margin: "0 auto 20px", fontSize: 16, lineHeight: 1.65 }}>
          {isAr
            ? "مكتبة تفاعلية تضم 50 برومبت بمستوى إخراج سينمائي وإعلاني سابق لأوانه. عدّل العناصر داخل أي بطاقة، اختر قياس الصورة (ريلز، يوتيوب، بورتريه)، وانسخ الكود الهندسي الجاهز بضغطة واحدة."
            : "An interactive studio of 50 high-concept, optically engineered image prompts. Customize live variables inside any card, select your aspect ratio, and copy in one click."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <a href={isAr ? "/ar/tools" : "/en/tools"} style={{
            padding: "10px 18px", borderRadius: 999, background: "var(--s2, #1e293b)",
            border: "1px solid var(--bd, #334155)", color: "inherit", textDecoration: "none", fontSize: 14, fontWeight: 600
          }}>
            {isAr ? "🧭 تصفح دليل الأدوات (33 أداة)" : "🧭 Browse AI Tools Directory (33)"}
          </a>
          <a href="/" style={{
            padding: "10px 18px", borderRadius: 999, background: "transparent",
            border: "1px solid var(--bd, #334155)", color: "inherit", textDecoration: "none", fontSize: 14
          }}>
            {isAr ? "🏠 العودة للرئيسية" : "🏠 Back to Home"}
          </a>
        </div>
      </div>

      {/* AdSlot 1: After Hero */}
      <div style={{ margin: "20px 0" }}>
        <AdSlot id="after-hero" lang={lang} />
      </div>

      {/* Interactive Controls Bar */}
      <div style={{
        background: "var(--s1, #111622)",
        border: "1px solid var(--bd, #232a3b)",
        borderRadius: 20,
        padding: 18,
        marginBottom: 28,
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}>
        {/* Search + Aspect Ratio */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "🔍 ابحث في الـ 50 برومبت (مثال: عطر، معمار، ساعة، دخان)..." : "🔍 Search 50 prompts (e.g. perfume, architecture, watch)..."}
            style={{
              flex: "1 1 260px", minHeight: 44, borderRadius: 12, padding: "0 14px",
              background: "var(--bg, #0b0e17)", border: "1px solid var(--bd, #2a3246)", color: "inherit", fontSize: 14
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRatio(r.id)}
                style={{
                  padding: "8px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  border: ratio === r.id ? "1px solid #6B7CFF" : "1px solid var(--bd, #2a3246)",
                  background: ratio === r.id ? "rgba(107,124,255,0.2)" : "var(--bg, #0b0e17)",
                  color: "inherit"
                }}
              >
                {isAr ? r.labelAr : r.labelEn}
              </button>
            ))}
            <button
              onClick={() => setRawMode(!rawMode)}
              style={{
                padding: "8px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                border: rawMode ? "1px solid #10B981" : "1px solid var(--bd, #2a3246)",
                background: rawMode ? "rgba(16,185,129,0.16)" : "var(--bg, #0b0e17)",
                color: "inherit"
              }}
            >
              {rawMode ? "✓ RAW 6.1" : "+ RAW 6.1"}
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  padding: "9px 15px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  border: active ? "1px solid #9A7BFF" : "1px solid var(--bd, #2a3246)",
                  background: active ? "linear-gradient(135deg, #6B7CFF, #9A7BFF)" : "var(--bg, #0b0e17)",
                  color: active ? "#fff" : "inherit"
                }}
              >
                {isAr ? c.ar : c.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: 16, fontSize: 14, color: "var(--mu, #94a3b8)", display: "flex", justifyContent: "space-between" }}>
        <span>{isAr ? `عرض ${filtered.length} من أصل 50 برومبت احترافي` : `Showing ${filtered.length} of 50 engineered prompts`}</span>
        <span>{isAr ? "💡 غيّر الكلمات داخل الخانات لتخصيص البرومبت قبل النسخ" : "💡 Edit the input boxes to customize any prompt live"}</span>
      </div>

      {/* Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
        gap: 20
      }}>
        {filtered.map((p, idx) => {
          const cv = customVars[p.id] || {};
          const v1Val = cv.v1 !== undefined ? cv.v1 : p.v1[2];
          const v2Val = cv.v2 !== undefined ? cv.v2 : p.v2[2];
          const finalPrompt = buildFinalPrompt(p);
          const isCopied = copiedId === p.id;

          return (
            <React.Fragment key={p.id}>
              <article style={{
                background: "var(--s1, #111622)",
                border: "1px solid var(--bd, #232a3b)",
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                {/* Visual DNA Header */}
                <div>
                  <div style={{
                    height: 86,
                    background: `linear-gradient(135deg, ${p.pal[0]} 0%, ${p.pal[1]} 55%, ${p.pal[2]} 100%)`,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    position: "relative"
                  }}>
                    <span style={{
                      background: "rgba(0,0,0,0.65)", color: "#fff", padding: "4px 10px",
                      borderRadius: 999, fontSize: 11.5, fontWeight: 700, backdropFilter: "blur(4px)"
                    }}>
                      #{p.id.toUpperCase()}
                    </span>
                    <span style={{
                      background: "rgba(0,0,0,0.65)", color: "#e2e8f0", padding: "4px 10px",
                      borderRadius: 999, fontSize: 11.5, direction: "ltr", backdropFilter: "blur(4px)"
                    }}>
                      📷 {p.cam}
                    </span>
                  </div>

                  {/* Title & Concept */}
                  <div style={{ padding: "16px 16px 12px" }}>
                    <h2 style={{ fontSize: 18, margin: "0 0 8px", lineHeight: 1.35 }}>
                      {isAr ? p.arT : p.enT}
                    </h2>
                    <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--mu, #94a3b8)", lineHeight: 1.55 }}>
                      {isAr ? p.arC : p.enC}
                    </p>

                    {/* Live Variable Inputs */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12,
                      background: "var(--bg, #0b0e17)", padding: 10, borderRadius: 12, border: "1px solid var(--bd, #1e2638)"
                    }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#9A7BFF", marginBottom: 4, fontWeight: 600 }}>
                          ✏️ {isAr ? p.v1[0] : p.v1[1]}
                        </label>
                        <input
                          type="text"
                          value={v1Val}
                          onChange={(e) => setCustomVars({ ...customVars, [p.id]: { ...cv, v1: e.target.value } })}
                          dir="ltr"
                          style={{
                            width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
                            background: "var(--s1, #111622)", border: "1px solid var(--bd, #2a3246)", color: "inherit"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#6B7CFF", marginBottom: 4, fontWeight: 600 }}>
                          ✏️ {isAr ? p.v2[0] : p.v2[1]}
                        </label>
                        <input
                          type="text"
                          value={v2Val}
                          onChange={(e) => setCustomVars({ ...customVars, [p.id]: { ...cv, v2: e.target.value } })}
                          dir="ltr"
                          style={{
                            width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
                            background: "var(--s1, #111622)", border: "1px solid var(--bd, #2a3246)", color: "inherit"
                          }}
                        />
                      </div>
                    </div>

                    {/* Prompt Code Box */}
                    <div
                      dir="ltr"
                      style={{
                        background: "#07090e", border: "1px solid #1e293b", borderRadius: 12,
                        padding: 12, fontSize: 12.5, lineHeight: 1.55, color: "#cbd5e1",
                        fontFamily: "monospace", userSelect: "all", maxHeight: 150, overflowY: "auto"
                      }}
                    >
                      {finalPrompt}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Copy Button + Recommended Tools */}
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => copyPrompt(p)}
                    style={{
                      width: "100%", minHeight: 44, borderRadius: 12, border: 0, cursor: "pointer",
                      fontWeight: 700, fontSize: 14, color: "#fff",
                      background: isCopied
                        ? "linear-gradient(135deg, #059669, #10B981)"
                        : "linear-gradient(135deg, #6B7CFF, #9A7BFF)"
                    }}
                  >
                    {isCopied
                      ? (isAr ? "✓ تم نسخ البرومبت بنجاح!" : "✓ Prompt Copied!")
                      : (isAr ? "📋 نسخ البرومبت الكامل" : "📋 Copy Engineered Prompt")}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--mu, #94a3b8)" }}>
                      {isAr ? "الأدوات المقترحة:" : "Best tools:"}
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {p.tools.map((tSlug) => (
                        <a
                          key={tSlug}
                          href={`/${lang}/tools/${tSlug}`}
                          style={{
                            padding: "3px 9px", borderRadius: 999, background: "rgba(107,124,255,0.12)",
                            border: "1px solid rgba(107,124,255,0.3)", color: "#a5b4fc", textDecoration: "none", fontSize: 11.5
                          }}
                        >
                          {tSlug} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              {/* Inline AdSlot after 10th card */}
              {idx === 9 && (
                <div style={{ gridColumn: "1 / -1", margin: "12px 0" }}>
                  <AdSlot id="tools-index-inline" lang={lang} />
                </div>
              )}

              {/* Inline AdSlot after 25th card */}
              {idx === 24 && (
                <div style={{ gridColumn: "1 / -1", margin: "12px 0" }}>
                  <AdSlot id="between-sections" lang={lang} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom AdSlot */}
      <div style={{ marginTop: 36 }}>
        <AdSlot id="before-footer" lang={lang} />
      </div>
    </div>
  );
}
