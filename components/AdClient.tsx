"use client";
import { useEffect, useRef, useState } from "react";
import type { AdConf } from "@/lib/ads";

const KEY = "aic_ads";
const https = (u?: string) => typeof u === "string" && u.startsWith("https://");
let adQueue: Promise<void> = Promise.resolve();

function granted(required: boolean) {
  if (!required) return true;
  try { return localStorage.getItem(KEY) === "granted"; } catch { return false; }
}

export function AdClient({ conf, label, required }: { conf: AdConf; label: string; required: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const check = () => setOk(granted(required));
    check();
    window.addEventListener("aic-ads", check);
    return () => window.removeEventListener("aic-ads", check);
  }, [required]);
  useEffect(() => {
    const el = box.current;
    if (!ok || !el || el.dataset.m) return;
    el.dataset.m = "1";
    if (conf.type === "image" && conf.image && https(conf.image.src) && https(conf.image.href)) {
      const a = document.createElement("a"); const i = new Image();
      a.href = conf.image.href; a.target = "_blank"; a.rel = "sponsored noopener noreferrer";
      i.src = conf.image.src; i.alt = conf.image.alt || ""; i.loading = "lazy"; i.style.maxWidth = "100%"; i.style.height = "auto";
      if (conf.image.width) i.width = conf.image.width; if (conf.image.height) i.height = conf.image.height;
      a.appendChild(i); el.appendChild(a);
    } else if (conf.type === "adsense" && conf.adsense?.client && conf.adsense.slot) {
      const ins = document.createElement("ins"); ins.className = "adsbygoogle"; ins.style.display = "block";
      ins.dataset.adClient = conf.adsense.client; ins.dataset.adSlot = conf.adsense.slot; ins.dataset.adFormat = conf.adsense.format || "auto"; ins.dataset.fullWidthResponsive = "true";
      el.appendChild(ins);
      if (!document.getElementById("adsense-js")) {
        const s = document.createElement("script"); s.id = "adsense-js"; s.async = true; s.crossOrigin = "anonymous";
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(conf.adsense.client);
        document.head.appendChild(s);
      }
      try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({}); } catch {}
    } else if (conf.type === "html" && conf.html) {
      const html = conf.html;
      adQueue = adQueue.then(() => new Promise<void>((resolve) => {
        if (!el.isConnected) { resolve(); return; }
        const frag = document.createRange().createContextualFragment(html);
        const scripts = Array.from(frag.querySelectorAll("script[src]"));
        if (!scripts.length) { el.appendChild(frag); resolve(); return; }
        let left = scripts.length;
        const timer = setTimeout(resolve, 2500);
        const done = () => { if (--left <= 0) { clearTimeout(timer); setTimeout(resolve, 60); } };
        scripts.forEach((s) => {
          s.addEventListener("load", done, { once: true });
          s.addEventListener("error", done, { once: true });
        });
        el.appendChild(frag);
      }));
    }
  }, [ok, conf]);
  if (!ok) return null;
  return (<aside className="ad" aria-label={label}><small>{label}</small><div className="adb" ref={box} /></aside>);
}

export function ConsentBar({ text, yes, no }: { text: string; yes: string; no: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(!localStorage.getItem(KEY)); } catch { setOpen(true); } }, []);
  if (!open) return null;
  const set = (v: string) => { try { localStorage.setItem(KEY, v); } catch {} setOpen(false); window.dispatchEvent(new Event("aic-ads")); };
  return (<div id="consent" role="dialog" aria-live="polite"><p>{text}</p><button className="yes" onClick={() => set("granted")}>{yes}</button><button onClick={() => set("denied")}>{no}</button></div>);
}
