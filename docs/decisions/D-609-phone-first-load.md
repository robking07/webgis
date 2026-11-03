# D-609 · Phone first load of /map: cut what isn't needed yet

- **Date:** 2026-11-03
- **Status:** DEFAULTED (worker, issue #505; the lead decides at merge)
- **PR:** #509

Before friends and colleagues get the link, the first visit to `/map` on a phone should show
colors quickly. We measured first, then fixed the three biggest causes. Nothing a visitor sees
changes: screenshots before and after are byte-identical (phone and laptop, national and county
zoom).

## How it was measured

A local production build (`npm run build`, then `next start`) loads `/map` in headless Chromium as
a phone (390 × 844, 2× pixels, touch), cold cache, with Lighthouse's mobile network throttling
(562.5 ms round trip, 1.47 Mbit/s down, 675 kbit/s up). Map files came from tiles.mapwich.org
through a local caching proxy, so R2 speed doesn't vary between runs. Three runs each; the table
shows medians. "Colors on screen" is the first frame after the state fill gets its colors and the
state boundary tiles are in. The script lived in the session scratchpad, not the repo.

CPU slowdown was left at 1× on purpose. At Lighthouse's 4× setting, this machine's software WebGL
spends 15–30 s drawing on the main thread, which a phone's GPU doesn't, and runs became noisy
(22–37 s) or timed out. The load is limited by the network anyway.

| | Before | After | Change |
| --- | --- | --- | --- |
| Colors on screen | 11.0 s | 9.1 s | −1.9 s (−17%) |
| First paint ("Loading map…") | 1.58 s | 1.70 s | +0.12 s |
| Bytes on first load of /map | 3,343 KB | 1,329 KB | −60% |
| JS (page + map worker) | 819 KB | 810 KB | same |
| Requests the page sees | 50 | 43 | −7 |
| A tap works: tap on the dataset button to the sheet open | 0.32 s | 0.33 s | same |
| Main thread blocked before colors (TBT) | 0.38 s | 0.42 s | same (noise) |
| Switch maps from the menu: pick to new colors | 1.06 s | 0.74 s | −0.3 s |

The worker script (145 KB) is fetched by the worker itself, so the page's network log missed it
before the change. It is added to the "before" byte and JS totals above.

## What changed

1. **No tract tiles at the national view.** The tract selection outlines were on at every zoom so
   a picked tract always shows. That made MapLibre load tract tiles at the national view: two
   tiles, 1.7 MB, competing with everything else on a phone's first load. Tract outlines now start
   at county zoom (5.5), or wherever tracts themselves start drawing if that is lower. Compare
   maps draw tracts at every zoom, so two far-apart tracts keep their outlines. Below county zoom
   on the main map, a tract is a dot. County and state outlines are unchanged.
2. **The map page doesn't prefetch Specials.** The header's Specials link was prefetched as soon
   as it appeared, which pulled in the Specials page and its lead image (~250 KB) during the map's
   first load. Specials now loads when tapped. That costs one small page request, as for any link
   that isn't prefetched.
3. **The map worker downloads with the page's JS.** MapLibre's worker script began downloading
   only once the map existed, and the first tiles waited for it (~1.2 s on the throttled phone).
   `/map` now emits a preload hint, so it downloads in parallel. First paint moves +0.12 s because
   it shares the line early, which is the trade. The worker's own request is then answered from
   the browser cache (0 body bytes, checked), so nothing downloads twice.

## Left alone, with what we'd do next

- **JS is the floor now** (~810 KB gzip: MapLibre 298 KB, its worker 145 KB, React and Next
  ~180 KB, the dataset registry 65 KB, app code ~120 KB). The registry ships every dataset's full
  description to the browser (522 KB raw). Splitting it into a small menu index plus per-dataset
  details would change how registry data is served, so it needs its own vote.
- **The map's own chunks wait for the page shell** (Next's `dynamic(..., { ssr: false })` doesn't
  preload them; ~3.3 s before they start on the throttled phone). Fixing that means rendering the
  viewer differently: an architecture change, not done.
- The basemap sprite (117 KB, @2x) loads in the same window; it belongs to the basemap style.

## Amendments
