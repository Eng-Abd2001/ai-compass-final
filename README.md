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

## Pages added after the first release

| Route | What it is | Where the code lives |
|---|---|---|
| `/en|ar/convert` | **Format Atlas**: PDF, image, Word, Excel, PowerPoint, CSV, JSON and Markdown conversions, all in the browser | `lib/convert/*`, `components/ConvertClient.tsx`, `public/vendor/` (pdf.js and pdf-lib, loaded only when a PDF is opened) |
| `/en|ar/hub` | **Smart Utility Hub**: 12 tools in a glass Bento grid | `lib/hub/*`, `components/hub/*`, `components/InteractiveHubClient.tsx` |
| every `/en|ar/*` page | Floating dock: `Ctrl+K` search and the stash drawer | `app/[lang]/layout.tsx`, `components/GlobalDock.tsx`, `CommandPalette.tsx`, `UniversalStash.tsx` |

Notes
- All interface texts of the new pages are in `content/ui/` (`convert.txt`, `hub.txt`). Edit them there; `npm run check` validates the keys.
- The home page (`/`) is the static `site/index.html`, so the dock is not shown there; it links to the new pages from the first buttons and the menu.
- `public/vendor/` holds third-party builds with their licences (PDF.js, Apache-2.0; pdf-lib, MIT). The CSP in `next.config.mjs` allows WebAssembly for PDF.js (`'wasm-unsafe-eval'`).
