# D-258 · Compare places side by side (PR 1 of 2)

- **Date:** 2026-10-09
- **Status:** DEFAULTED (worker, roadmap 1.1, issue #117; plan from the review lead's verdict of 2026-10-09, adopted by the lead)
- **PR:** #158. PR 2 (the laptop map with both places outlined, counts and share of parent) follows.

**Robbie (2026-10-06):** a comparison starts from a place: tap a place, "Compare with…", pick a
second place. Two places. "Compare datasets" for the existing two-variable map, "Compare places"
for the new one. On a phone it's a quick insight: no map, larger fonts for the top-level
difference. **Robbie (2026-10-09):** "ensure that the user only sees the data, time bounds, or other
settings that work for the feature they are using."

## Decided

1. **Route:** `/compare/<geoid A>/<geoid B>?d=<dataset id>`. A is where the visitor started, B the
   place they picked, `d` the metric they were viewing (it leads the page; unknown or missing `d`
   falls back to the landing map's metric). Two different places at the same level, or 404.
   `compareHref` / `parseCompare` in `apps/web/src/lib/compare.ts`, round-tripped in unit tests.
   No map at any screen size in PR 1.
2. **Levels:** state, county and tract, same level only. **Tract is the finest:** a block group (or
   block) compares as the tract it sits in, and the details panel says so in one line.
3. **The difference test (ACS only).** ACS margins of error are at 90% confidence, so
   SE = MOE / 1.645. For two independent estimates the standard error of the difference is
   √(SE_A² + SE_B²), and the gap is clear when |A − B| / SE_diff > 1.645. The 1.645s cancel:
   **clear when |A − B| > √(MOE_A² + MOE_B²)** (the Census Bureau's comparison test, at 90%).
   - The brief's `|A−B| > 1.645·√(moeA²+moeB²)` applies 1.645 twice (it would be a ~99.9% test on
     margins that are already at 90%); the brief asked for the statistically right formula, so this is it.
   - Not clear: the headline reads **"About the same"** in large type with both numbers underneath,
     and a note says the gap is within the margins of error. Rows say "About the same".
   - A missing margin: the plain difference, with a note that the gap isn't tested.
   - Not ACS (`isGradable`, D-222): CDC PLACES (its ± is a 95% interval), climate, FARS, Census 2020
     counts, LODES and the rest show the plain difference with no verdict.
   - Equal values read "The same". The covariance between overlapping areas is ignored (same-level
     places don't overlap).
4. **What the page shows:** the metric in large type ("Ramsey County is 2.4 points higher"; percent
   and percentile gaps in points, other units in their own format), both values with ±, and both
   ranks for state and county (one `values/<id>/<level>.json`; no tract ranks, the national tract
   file is too big for a phone). Below: the rest of that metric's topic group (registry `category`),
   each row with both values and which is higher. Other topic groups sit behind "More topics",
   closed. **Rows only for datasets with a value for both places** (no "No data" rows).
5. **Where "Compare with…" appears** (one helper, `canCompare`): only in the details panel, only
   for a choropleth map (never roads or points) that has values at the compare level, in its default
   period (the click-details files hold only that period), when place A has a value. Block- and
   block-group-only maps never offer it.
6. **Picking place B:** states and counties search the existing place index (`geo/search.json`),
   filtered to A's level (cities, towns, boroughs, villages and Census places dropped; A left out).
   Tracts aren't in the index (checked: its kinds are State, County, Community, City, Town, Borough,
   Place, Village), so for a tract the panel says "Tap another tract on the map", and the next
   different tract the visitor taps opens the comparison. Closing the panel cancels.
7. **Static only:** `details/<state>.json` (states, counties), `values/tracts/<county>.json` (tracts),
   `geo/tracts/<county>.json` (tract point for the "Back to the map" link), through `lib/details.ts`.
   No database call (an e2e test fails on any Supabase request).
8. **Data budget (phone, about 600 KB):** measured gzipped on 2026-10-09. Hennepin vs Ramsey:
   details/27.json 132 KB + one county values file 15 KB = 147 KB of data, plus 269 KB of page
   code and 4 KB HTML on a cold load. Two Hennepin tracts: 154 KB + 6 KB. Worst case, a Texas county
   vs a California one: 372 + 92 + 15 = 479 KB of data (Texas's details file is the largest).
   From the map most of this is already loaded (same state file). The picker reuses the place index
   the details panel already loads for its "inside" links (520 KB, not counted above).
9. **Link previews:** the route has its own title ("Hennepin County, MN vs Ramsey County, MN ·
   Mapwich") and description; the image is the plain home card (no per-comparison card).
10. **Rename:** the dataset card's "Compare" is now "Compare datasets" (phone and desktop); it fits
    the phone card's one line (D-135).

## Code

`apps/web/src/lib/compare.ts` (+ test), `app/compare/[a]/[b]/page.tsx`, `components/compare/ComparePlaces.tsx`,
`components/compare/CompareWith.tsx` (one line in `DetailPanel.tsx`), `e2e/compare.tests.mjs`
(registered from `menus.spec.mjs`, the first feature split out of it).

## Amendments

- 2026-10-10, Robbie: the headline names the higher place; a second tract tap opens compare at once; the button stays "Compare with…". The on-screen wording still needs his OK.

## PR 2a (2026-10-12, worker; plan from the review lead's verdict of 2026-10-09)

PR 2 is split: **2a** (this) needs no new data; **2b** adds counts, share of parent and
parts-of-a-whole bars once the counts files are uploaded (D-257).

1. **Laptops and monitors (≥ 1024 px, D-135's `lg`) show a map beside the panel**: the compared
   metric as the choropleth at the compare level, with its legend, and both places outlined. The map
   is `SpecialMap` (the Specials' map: `MapView`, the same values files and classing) with a new
   `compare` prop, so nothing is forked. It is sticky beside the scrolling panel, with cooperative
   gestures like any map inside a scrolling page (Ctrl/⌘ + scroll zooms). No map when the metric has
   no values at the compare level. Hover and clicks on it select nothing.
2. **Outline styles (design tokens):** place A (where the visitor started) keeps the solid
   selection outline; place B gets the same outline **dashed** (`SECOND_OUTLINE_DASH`, 2 on, 1.5
   off, in line widths; layer `<level>-highlight-second`, feature state `second`). Same color and
   halo, so the two differ by pattern, not color, and read for colorblind visitors. A key on the map
   names both with a sample of each line.
3. **Framing:** the map opens on a rough box from each place's center and land area (from files the
   page already loads), then fits both real outlines once their tiles are in.
4. **Phones and tablets: unchanged, no map.** The map mounts only when the `lg` media query
   matches (it starts false), so a phone fetches no map code, tiles or extra values files. Part 1's
   data budget stands.
5. **All topic groups are listed, folded**, the metric's own first and open (still only rows with a
   value for both places). "More in …" and "More topics" are gone; each group is headed by its name
   and row count.
