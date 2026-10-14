# AI Compass

Bilingual (AR/EN) AI decision platform. Next.js project, deployable on Vercel.

**Content is separate from code.** Every text, tool, page and ad lives in plain files under `content/`
(Arabic guide: [`content/README.md`](content/README.md)). No `.tsx` file contains visible text.

## Run
```bash
npm install
npm run check      # validates every content file; errors are explained in Arabic with file + line
npm run dev        # preview locally (restart after editing content)
npm run build && npm start
```
Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) to your domain on Vercel.

## How it fits together
- `content/` — the only place you edit: tools (one file each), pages (one file each), interface texts per section (`ui/home/*.txt`, `ui/pages.txt`), money/future/safety/careers/academy lists, categories, platforms, ads, site settings.
- `scripts/content.mjs` — reads and validates those files (friendly errors); `scripts/build-html.mjs` runs before dev/build/check, writes `data/*.generated.json`, `content/VERIFICATION-REPORT.md` and `public/index.html`.
- `site/index.html` — the home page **template** (layout and behaviour only; all data and texts are injected from `content/`).
- `app/`, `components/`, `lib/` — Next.js pages for `/en|ar/tools`, `/en|ar/tools/<id>` and the legal pages. They read `data/*.generated.json` only.
- `next.config.mjs` — serves the home page at `/`, security headers, CSP (opens only the ad domains listed in `content/ads.txt`).
- `public/sw.js` — offline shell. `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` — SEO and PWA.

## Verified data
A tool is "Verified" only when its file has `checked`, `source`, `paid_from` and at least one `plan:` line (the build rejects partial evidence). The report in `content/VERIFICATION-REPORT.md` lists what is left and what is older than 90 days.

## Ads
Configured only in `content/ads.txt`. Off by default; always labelled; consent bar before anything loads; the Privacy and Affiliate pages change their text automatically when ads are enabled.

## Not included yet
Analytics, accounts, admin dashboard, database, payments.
