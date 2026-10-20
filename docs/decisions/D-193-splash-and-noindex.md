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

## Amendment 2026-10-14: questions that link into the map (issue #224)

Robbie: "I had an idea for a new splash screen that explains what the site is about. It should be a
largely empty page with flashing underscore, like waiting for typing and then it fills in
dynamically with various questions like: how many people bike to work in [ random US county ]? do
people who work from home get more exercise? I want you to generate a number of these questions that
could be answer by the site. When a sentence is on screen and someone scrolls over it, have appear
clickable, when someone clicks it it brings them to the map to help answer that question."

- **The splash now links into the map** (this replaces "no link" above). Under the logo, on the same
  black tokens, a blinking `_` types one question, holds it, erases it and types the next, in random
  order with no immediate repeat. The question is a link to the map set up for it: one map
  (`/map?d=`), two maps on one (`&b=`, D-323), or two places side by side (`/compare/<A>/<B>?d=`).
  "{county}" questions name a random county (50 states and DC) and open the map centered on it.
- Hover or keyboard focus holds the question on screen and shows the underline and arrow; phones
  (no hover) show them all the time. Screen readers get the whole question as the link's name, not
  the letters. Reduced motion: a static list of five random questions, no typing.
- **Content:** `apps/web/content/splash/questions.yaml` (text, link, `county: random`), drafted by
  the lead, edited by Robbie. Checked at every build (`src/lib/splash-load.mts`: maps, second maps,
  levels and place codes exist) and by `npm test` (two-map questions must pair, `pairReason`).
- **Gate (as D-279):** while the file says `approved: false`, production builds carry no questions and
  `/` stays the logo and "which map?". Other builds show them at `/?splash=preview` with a
  "Draft · not approved" line. Robots and noindex are unchanged.
- Worker defaults (open to Robbie): "which map?" gives way to the questions; logo stays 120 px;
  timing about 45 ms a letter, 3 s hold; questions in the tagline grey, the ink white on hover.
