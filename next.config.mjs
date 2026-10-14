import { loadAds } from "./scripts/content.mjs";
const prod = process.env.NODE_ENV === "production";
let ads = { enabled: false, cspAllow: [] };
try { ads = loadAds("content/ads.txt"); } catch {}
const extra = ads.enabled ? "https: data: blob: 'unsafe-eval'" : "";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${extra}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${extra}`,
  `connect-src 'self' ${extra}`,
  `frame-src 'self' data: blob: ${extra || "'none'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/index.html" }] };
  },
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: prod ? [...base, { key: "Content-Security-Policy", value: csp }] : base },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
