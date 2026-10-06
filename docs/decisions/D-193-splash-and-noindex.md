# D-193 · Splash page, map at /map, noindex

Date: 2026-10-05. Decided by Robbie (issue #92, PR #93).

Robbie: "I think the site should not be accessible via .com - it doesn't need to be elaborately hidden, just a splash page on .com, make the splash screen just the logo on black background with the tagline "which map?" and deny robots for SEO/indexing purposes for all other pages (if possible)" ... "sorry! I meant .org site, we don't own .com yet".

- **Splash at `/`.** The logo on black and "which map?", nothing else (no link, header, footer or map).
  Black is Robbie's explicit choice, so it is a design token (`ui.splashBg`, with `splashInk` and
  `splashTagline`, the same in both themes, contrast-checked in `check:design`), not an ad hoc color.
- **The map moves to `/map`.** Datasets, Specials and places keep their addresses. Every "go to the
  map" link (header Map and logo, Map it, place pages, Specials, 404, pairings) builds `/map...`.
- **Old shared links keep working.** A request to `/` carrying any map-view parameter (`d`, `b`,
  `at`, `lv`, `t`) is redirected (307) to `/map` with the same query string, from `next.config.ts`.
  Bare `/` is the splash. (`?theme=` alone does not redirect.)
- **Search engines.** `robots.txt` is `Allow: /$` + `Disallow: /` (Google and Bing honour `$`; the
  longer rule wins, so only `/` is allowed). The root layout sets `robots: noindex, nofollow` for
  every page; the splash overrides with `index`. No sitemap. The `/og/*` card images are blocked by
  robots.txt too (link-preview bots that fetch on demand mostly ignore it); revisit if previews fail.

## Undo at roadmap 3.6 "go public"

Delete `app/robots.ts` (or allow everything) and the `robots` line in `app/layout.tsx`. To put the map
back on `/`: move `app/map/page.tsx` to `app/page.tsx` (keep the `/map` redirect), delete the splash,
and point the links above back at `/`. Or keep `/map` and make the splash a real landing page.
