// @ts-nocheck
"use client";
import React, { useState, useMemo, useEffect } from "react";
import { PROMPTS, CATEGORIES, type PromptItem } from "@/data/prompts";
import AdSlot from "@/components/AdSlot";

const RATIOS = [
  { id: "--ar 9:16", labelAr: "9:16 ريلز/ستوري", labelEn: "9:16 Reels" },
  { id: "--ar 16:9", labelAr: "16:9 يوتيوب", labelEn: "16:9 YouTube" },
  { id: "--ar 1:1", labelAr: "1:1 مربع", labelEn: "1:1 Square" },
  { id: "--ar 4:5", labelAr: "4:5 بورتريه", labelEn: "4:5 Portrait" }
];

const CAT_ICONS: Record<string, string> = {
  "all": "🔥",
  "dark-cinematic": "🎬",
  "chrono-architecture": "🏛️",
  "impossible-commercial": "💎",
  "micro-worlds": "🔬",
  "tactile-branding": "✨"
};

function getPreviewUrl(p: PromptItem, v1?: string, v2?: string, seedOffset = 0) {
  const val1 = v1 || p.v1[2];
  const val2 = v2 || p.v2[2];
  const raw = p.prompt
    .replace("[VAR1]", val1)
    .replace("[VAR2]", val2)
    .split(", ultra-detailed")[0]
    .slice(0, 220);
  const num = parseInt(p.id.replace("p-", ""), 10) || 1;
  const seed = num * 137 + seedOffset;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(raw + ", 8k photorealistic masterpiece, cinematic lighting")}?width=640&height=420&seed=${seed}&nologo=true`;
}

export default function PromptsVaultClient({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar";
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [ratio, setRatio] = useState<string>("--ar 9:16");
  const [rawMode, setRawMode] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [zoomItem, setZoomItem] = useState<{ p: PromptItem; url: string } | null>(null);
  const [customVars, setCustomVars] = useState<Record<string, { v1?: string; v2?: string; seed?: number }>>({});
  const [loadedImgs, setLoadedImgs] = useState<Record<string, boolean>>({});

  const PER_PAGE = 10;

  useEffect(() => {
    setPage(1);
    setOpenId(null);
  }, [cat, q]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const buildFinalPrompt = (p: PromptItem) => {
    const cv = customVars[p.id] || {};
    const val1 = (cv.v1 !== undefined ? cv.v1 : p.v1[2]) || p.v1[2];
    const val2 = (cv.v2 !== undefined ? cv.v2 : p.v2[2]) || p.v2[2];
    const text = p.prompt.replace("[VAR1]", val1).replace("[VAR2]", val2);
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
    setTimeout(() => setCopiedId((prev) => (prev === p.id ? null : prev)), 2000);
  };

  const refreshPreview = (id: string) => {
    const cv = customVars[id] || {};
    setLoadedImgs((prev) => ({ ...prev, [id]: false }));
    setCustomVars({
      ...customVars,
      [id]: { ...cv, seed: (cv.seed || 0) + 1 }
    });
  };

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "20px 14px 64px" }} dir={isAr ? "rtl" : "ltr"}>
      {/* Clean Header */}
      <div style={{
        background: "linear-gradient(145deg, rgba(107,124,255,0.14), rgba(15,23,42,0.9))",
        border: "1px solid rgba(107,124,255,0.28)",
        borderRadius: 22,
        padding: "clamp(18px, 3.5vw, 30px)",
        marginBottom: 20,
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "rgba(107,124,255,0.18)", color: "#a5b4fc",
          fontSize: 12.5, fontWeight: 700, marginBottom: 10
        }}>
          {isAr ? "🖼️ معرض البرومبتات المصور — 50 نتيجة جاهزة للنسخ" : "🖼️ Visual Prompt Gallery — 50 Ready-to-Copy Prompts"}
        </div>
        <h1 style={{ fontSize: "clamp(24px, 4.5vw, 36px)", margin: "0 0 10px", lineHeight: 1.25 }}>
          {isAr ? "مختبر البرومبتات الخارقة بالصور" : "Avant-Garde AI Image Prompts"}
        </h1>
        <p style={{ color: "var(--mu, #94a3b8)", maxWidth: 640, margin: "0 auto 16px", fontSize: 14.5, lineHeight: 1.6 }}>
          {isAr
            ? "شاهد نتيجة كل برومبت بالصورة، وانسخه بضغطة زر واحدة، أو افتح خيار (تخصيص) لتعديل عناصر الصورة وتوليد معاينة جديدة."
            : "Preview the visual result of every prompt, copy in one click, or open Customize to edit variables and regenerate."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={{
            padding: "8px 16px", borderRadius: 999, background: "var(--s2, #1e293b)",
            border: "1px solid var(--bd, #334155)", color: "inherit", textDecoration: "none", fontSize: 13, fontWeight: 600
          }}>
            {isAr ? "🏠 الصفحة الرئيسية" : "🏠 Home"}
          </a>
          <a href={isAr ? "/ar/tools" : "/en/tools"} style={{
            padding: "8px 16px", borderRadius: 999, background: "transparent",
            border: "1px solid var(--bd, #334155)", color: "inherit", textDecoration: "none", fontSize: 13
          }}>
            {isAr ? "🧭 دليل الأدوات (33)" : "🧭 AI Tools (33)"}
          </a>
        </div>
      </div>

      {/* AdSlot 1 */}
      <div style={{ margin: "16px 0" }}>
        <AdSlot id="after-hero" lang={lang} />
      </div>

      {/* Simple Category Tabs + Search */}
      <div style={{
        background: "var(--s1, #111622)",
        border: "1px solid var(--bd, #232a3b)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 22
      }}>
        {/* Category Buttons */}
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10,
          marginBottom: 12, borderBottom: "1px solid var(--bd, #1e293b)"
        }}>
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  flex: "0 0 auto",
                  padding: "9px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: active ? "1px solid #818cf8" : "1px solid var(--bd, #2a3246)",
                  background: active ? "linear-gradient(135deg, #6B7CFF, #9A7BFF)" : "var(--bg, #0b0e17)",
                  color: active ? "#fff" : "inherit",
                  transition: "all 0.15s ease"
                }}
              >
                {CAT_ICONS[c.id] || "✨"} {isAr ? c.ar : c.en}
              </button>
            );
          })}
        </div>

        {/* Search + Global Ratio */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "🔍 ابحث عن فكرة (عطر، ساعة، معمار، دخان، شعار)..." : "🔍 Search prompts (perfume, watch, architecture, logo)..."}
            style={{
              flex: "1 1 240px", minHeight: 40, borderRadius: 10, padding: "0 12px",
              background: "var(--bg, #0b0e17)", border: "1px solid var(--bd, #2a3246)", color: "inherit", fontSize: 13.5
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--mu, #94a3b8)" }}>
              {isAr ? "مقاس النسخ:" : "Copy Ratio:"}
            </span>
            {RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRatio(r.id)}
                style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: ratio === r.id ? "1px solid #6B7CFF" : "1px solid var(--bd, #2a3246)",
                  background: ratio === r.id ? "rgba(107,124,255,0.22)" : "var(--bg, #0b0e17)",
                  color: "inherit"
                }}
              >
                {isAr ? r.labelAr : r.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Status Bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, fontSize: 13, color: "var(--mu, #94a3b8)", flexWrap: "wrap", gap: 8
      }}>
        <span>
          {isAr
            ? `عرض ${currentItems.length} برومبت (صفحة ${page} من ${totalPages} — الإجمالي ${filtered.length})`
            : `Showing ${currentItems.length} prompts (Page ${page} of ${totalPages} — Total ${filtered.length})`}
        </span>
        <span>
          {isAr ? "💡 اضغط على أي صورة لتكبيرها، أو اضغط (نسخ) مباشرة" : "💡 Tap any image to zoom, or Copy directly"}
        </span>
      </div>

      {/* Organized 2-Column Gallery Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))",
        gap: 20
      }}>
        {currentItems.map((p, idx) => {
          const cv = customVars[p.id] || {};
          const v1Val = cv.v1 !== undefined ? cv.v1 : p.v1[2];
          const v2Val = cv.v2 !== undefined ? cv.v2 : p.v2[2];
          const imgUrl = getPreviewUrl(p, v1Val, v2Val, cv.seed || 0);
          const finalPrompt = buildFinalPrompt(p);
          const isCopied = copiedId === p.id;
          const isOpen = openId === p.id;
          const isLoaded = !!loadedImgs[p.id];
          const globalNum = p.id.replace("p-", "");

          return (
            <React.Fragment key={p.id}>
              <article style={{
                background: "var(--s1, #111622)",
                border: isOpen ? "1px solid #6B7CFF" : "1px solid var(--bd, #232a3b)",
                borderRadius: 18,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 6px 20px rgba(0,0,0,0.28)"
              }}>
                <div>
                  {/* Image Preview Box */}
                  <div
                    onClick={() => setZoomItem({ p, url: imgUrl })}
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 10",
                      background: `linear-gradient(135deg, ${p.pal[0]} 0%, ${p.pal[1]} 55%, ${p.pal[2]} 100%)`,
                      cursor: "zoom-in",
                      overflow: "hidden"
                    }}
                  >
                    {/* Placeholder Shimmer while AI Image renders */}
                    {!isLoaded && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center",
                        background: "rgba(9,13,22,0.45)", backdropFilter: "blur(6px)"
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{CAT_ICONS[p.cat] || "🎨"}</div>
                        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>
                          {isAr ? "جاري تحميل صورة النتيجة..." : "Loading AI preview..."}
                        </span>
                      </div>
                    )}

                    <img
                      src={imgUrl}
                      alt={isAr ? p.arT : p.enT}
                      loading={idx < 4 ? "eager" : "lazy"}
                      onLoad={() => setLoadedImgs((prev) => ({ ...prev, [p.id]: true }))}
                      onError={(e) => {
                        setLoadedImgs((prev) => ({ ...prev, [p.id]: true }));
                        (e.currentTarget as HTMLImageElement).style.opacity = "0";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        opacity: isLoaded ? 1 : 0,
                        transition: "opacity 0.35s ease"
                      }}
                    />

                    {/* Top Overlay Badges */}
                    <div style={{
                      position: "absolute", top: 10, insetInline: 10,
                      display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none"
                    }}>
                      <span style={{
                        background: "rgba(0,0,0,0.72)", color: "#fff", padding: "4px 10px",
                        borderRadius: 999, fontSize: 12, fontWeight: 700, backdropFilter: "blur(4px)"
                      }}>
                        #{globalNum}
                      </span>
                      <span style={{
                        background: "rgba(0,0,0,0.72)", color: "#e2e8f0", padding: "4px 10px",
                        borderRadius: 999, fontSize: 11, backdropFilter: "blur(4px)"
                      }}>
                        🔍 {isAr ? "تكبير" : "Zoom"}
                      </span>
                    </div>
                  </div>

                  {/* Clean Card Body: Title + Short Description Only */}
                  <div style={{ padding: "14px 16px 12px" }}>
                    <h2 style={{ fontSize: 17, margin: "0 0 6px", lineHeight: 1.35 }}>
                      {isAr ? p.arT : p.enT}
                    </h2>
                    <p style={{
                      margin: 0, fontSize: 13, color: "var(--mu, #94a3b8)", lineHeight: 1.55,
                      display: "-webkit-box", WebkitLineClamp: isOpen ? 10 : 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                    }}>
                      {isAr ? p.arC : p.enC}
                    </p>
                  </div>
                </div>

                {/* Clean 2-Button Action Row */}
                <div style={{ padding: "0 16px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => copyPrompt(p)}
                      style={{
                        flex: 1, minHeight: 42, borderRadius: 11, border: 0, cursor: "pointer",
                        fontWeight: 700, fontSize: 13.5, color: "#fff",
                        background: isCopied
                          ? "linear-gradient(135deg, #059669, #10B981)"
                          : "linear-gradient(135deg, #6B7CFF, #9A7BFF)"
                      }}
                    >
                      {isCopied
                        ? (isAr ? "✓ تم النسخ!" : "✓ Copied!")
                        : (isAr ? "📋 نسخ البرومبت" : "📋 Copy Prompt")}
                    </button>

                    <button
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                      style={{
                        padding: "0 13px", minHeight: 42, borderRadius: 11, cursor: "pointer",
                        fontWeight: 600, fontSize: 12.5,
                        border: "1px solid var(--bd, #2a3246)",
                        background: isOpen ? "rgba(107,124,255,0.2)" : "var(--bg, #0b0e17)",
                        color: "inherit"
                      }}
                    >
                      {isOpen
                        ? (isAr ? "✖ إغلاق" : "✖ Close")
                        : (isAr ? "🎛️ تخصيص / الكود" : "🎛️ Customize")}
                    </button>
                  </div>

                  {/* Collapsible Drawer: Only shown when user clicks Customize */}
                  {isOpen && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: "1px dashed var(--bd, #2a3246)",
                      display: "flex", flexDirection: "column", gap: 10
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#a5b4fc", marginBottom: 4, fontWeight: 600 }}>
                            ✏️ {isAr ? p.v1[0] : p.v1[1]}
                          </label>
                          <input
                            type="text"
                            value={v1Val}
                            onChange={(e) => setCustomVars({ ...customVars, [p.id]: { ...cv, v1: e.target.value } })}
                            dir="ltr"
                            style={{
                              width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
                              background: "var(--bg, #0b0e17)", border: "1px solid var(--bd, #2a3246)", color: "inherit"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "#a5b4fc", marginBottom: 4, fontWeight: 600 }}>
                            ✏️ {isAr ? p.v2[0] : p.v2[1]}
                          </label>
                          <input
                            type="text"
                            value={v2Val}
                            onChange={(e) => setCustomVars({ ...customVars, [p.id]: { ...cv, v2: e.target.value } })}
                            dir="ltr"
                            style={{
                              width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
                              background: "var(--bg, #0b0e17)", border: "1px solid var(--bd, #2a3246)", color: "inherit"
                            }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => refreshPreview(p.id)}
                        style={{
                          width: "100%", padding: "8px", borderRadius: 9, cursor: "pointer",
                          border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.12)",
                          color: "#6ee7b7", fontSize: 12.5, fontWeight: 600
                        }}
                      >
                        {isAr ? "✨ تحديث صورة النتيجة حسب تعديلك" : "✨ Regenerate Preview with Your Edits"}
                      </button>

                      <div
                        dir="ltr"
                        style={{
                          background: "#07090e", border: "1px solid #1e293b", borderRadius: 10,
                          padding: 10, fontSize: 11.5, lineHeight: 1.5, color: "#cbd5e1",
                          fontFamily: "monospace", userSelect: "all", maxHeight: 110, overflowY: "auto"
                        }}
                      >
                        {finalPrompt}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 11.5 }}>
                        <span style={{ color: "var(--mu, #94a3b8)" }}>
                          📷 {p.cam}
                        </span>
                        <div style={{ display: "flex", gap: 5 }}>
                          {p.tools.map((tSlug) => (
                            <a
                              key={tSlug}
                              href={`/${lang}/tools/${tSlug}`}
                              style={{
                                padding: "2px 8px", borderRadius: 999, background: "rgba(107,124,255,0.14)",
                                color: "#a5b4fc", textDecoration: "none"
                              }}
                            >
                              {tSlug} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>

              {/* Inline AdSlot after 4th card on page */}
              {idx === 3 && (
                <div style={{ gridColumn: "1 / -1", margin: "8px 0" }}>
                  <AdSlot id="tools-index-inline" lang={lang} />
                </div>
              )}

              {/* Inline AdSlot after 8th card on page */}
              {idx === 7 && (
                <div style={{ gridColumn: "1 / -1", margin: "8px 0" }}>
                  <AdSlot id="between-sections" lang={lang} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Clean Numbered Pagination Bar */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 8, marginTop: 32, flexWrap: "wrap"
        }}>
          <button
            disabled={page <= 1}
            onClick={() => { setPage(page - 1); window.scrollTo({ top: 180, behavior: "smooth" }); }}
            style={{
              padding: "10px 16px", borderRadius: 12, cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.45 : 1, border: "1px solid var(--bd, #2a3246)",
              background: "var(--s1, #111622)", color: "inherit", fontWeight: 700, fontSize: 13
            }}
          >
            {isAr ? "→ السابق" : "← Prev"}
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => { setPage(n); window.scrollTo({ top: 180, behavior: "smooth" }); }}
              style={{
                minWidth: 42, height: 42, borderRadius: 12, cursor: "pointer",
                border: page === n ? "1px solid #818cf8" : "1px solid var(--bd, #2a3246)",
                background: page === n ? "linear-gradient(135deg, #6B7CFF, #9A7BFF)" : "var(--s1, #111622)",
                color: page === n ? "#fff" : "inherit", fontWeight: 700, fontSize: 14
              }}
            >
              {n}
            </button>
          ))}

          <button
            disabled={page >= totalPages}
            onClick={() => { setPage(page + 1); window.scrollTo({ top: 180, behavior: "smooth" }); }}
            style={{
              padding: "10px 16px", borderRadius: 12, cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.45 : 1, border: "1px solid var(--bd, #2a3246)",
              background: "var(--s1, #111622)", color: "inherit", fontWeight: 700, fontSize: 13
            }}
          >
            {isAr ? "التالي ←" : "Next →"}
          </button>
        </div>
      )}

      {/* Lightbox Modal when clicking any Image */}
      {zoomItem && (
        <div
          onClick={() => setZoomItem(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 99, background: "rgba(4,7,14,0.88)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 680, width: "100%", background: "var(--s1, #111622)",
              border: "1px solid var(--bd, #334155)", borderRadius: 20, overflow: "hidden"
            }}
          >
            <img
              src={zoomItem.url}
              alt={isAr ? zoomItem.p.arT : zoomItem.p.enT}
              style={{ width: "100%", maxHeight: "62vh", objectFit: "contain", background: "#05070c", display: "block" }}
            />
            <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>
                  {isAr ? zoomItem.p.arT : zoomItem.p.enT}
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--mu, #94a3b8)" }}>
                  {isAr ? zoomItem.p.arC : zoomItem.p.enC}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => copyPrompt(zoomItem.p)}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: 0, cursor: "pointer",
                    background: "linear-gradient(135deg, #6B7CFF, #9A7BFF)", color: "#fff", fontWeight: 700, fontSize: 13
                  }}
                >
                  {copiedId === zoomItem.p.id ? (isAr ? "✓ تم النسخ!" : "✓ Copied!") : (isAr ? "📋 نسخ البرومبت" : "📋 Copy Prompt")}
                </button>
                <button
                  onClick={() => setZoomItem(null)}
                  style={{
                    padding: "10px 14px", borderRadius: 10, border: "1px solid var(--bd, #334155)",
                    background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 600, fontSize: 13
                  }}
                >
                  {isAr ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom AdSlot */}
      <div style={{ marginTop: 32 }}>
        <AdSlot id="before-footer" lang={lang} />
      </div>
    </div>
  );
}
