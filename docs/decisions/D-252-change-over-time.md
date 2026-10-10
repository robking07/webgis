# D-252 · Change-over-time maps

- **Date:** 2026-10-09
- **Status:** DECIDED (Robbie, the measure and margin-of-error rules, 2026-10-08); DEFAULTED (worker, the technical choices below)
- **PR:** #152 (issue #127, roadmap 1.2)

**Problem.** Planners ask "what changed here since 2019?" The year control (D-36, #144) shows one
period at a time; nothing showed the change between two.

**Decided (Robbie).**
- **Measure:** percentages change in **percentage points**; counts change in **percent**.
- **Margin of error:** when both periods are ACS estimates and the change is within the margin of
  error of the difference, the area is **"no clear change"**, the neutral middle of the ramp.
  The margin of a difference is the Census Bureau's approximation **√(MOE₁² + MOE₂²)**.

**Defaulted (worker).**
- **Where it lives:** Filters, under the year control: "Show change since" with a drop-down of
  the dated periods before the shown one (newest first, "Off" first). The year control picks the
  later period, so there's still one year picker. Averages and normals (FARS, climate) are not a
  moment in time, so they offer no change. URL: `since=<stop id>` beside `t=`; the filter count
  counts it. Comparing two datasets turns it off (as it does the year).
- **Computed in the browser** from the two value files already on R2 (`values/<id>/<stop>/<level>.json`);
  no new files, no database (`apps/web/src/lib/change.ts`).
- **Measure by unit** (registry `unit`): `percent` → points; amounts (`count`, `per_sq_mi`,
  `dollars`, `vehicles_per_day`, `miles_per_day`) → percent change; everything else (rates per
  100k, minutes, years, °F, inches, degree days, ratios, percentiles…) → a plain difference in its
  own unit. A percent change from a zero base is no data (zero to zero is no change).
  ACS dollars are already restated in 2024 dollars (D-36), so income changes are real changes.
- **Classes:** 7 on `CHANGE_RAMP` (Orange–Purple, a new token in `packages/design/src/ramps.ts`):
  three down, the middle, three up. Cut-offs are thirds of every area's absolute change, the same
  on both sides, so equal rises and falls look equally strong. Orange–purple has no good/bad
  reading (a rise in poverty and in income look alike).
- **No data:** the ramp's near-white middle sat ΔE 8 from the light theme's no-data gray, so change
  maps fill missing areas with a new theme token, `map.noDataChange` (darker in light, the same as
  `noData` in dark). The design gate checks every change class against it under all four visions.
- **Margins actually tested:** only where both values' margins can be had from the files the app
  already loads, which today means **tracts, when the later period is the default**, using the
  tract shards of the counties in view (the same files and cache as hatching, D-222).
  - Earlier periods publish **no margins**. MOE₁ is estimated as the later margin at the same
    relative size (MOE₁ ≈ MOE₂ · |value₁ / value₂|). `shortcut:` in `change.ts`; use real margins
    once the ingest exports `values/<id>/<stop>/<level>.moe.json`.
  - Counties and states aren't tested on the map: their margins are only in the per-state detail
    files (~6 MB for the country). The details panel does test them (one file), and says
    "No clear change" under the number. The middle class there is exactly no change.
  - The legend says "No clear change" when margins were tested, "No change" otherwise.
- **Boundaries:** the earlier ACS periods are keyed to 2010 tracts and pre-2022 Connecticut
  counties. The map draws the later period's boundaries and matches areas by GEOID: tracts kept
  their code in 2020 when their boundaries stayed the same or changed only slightly, and split or
  merged tracts got new codes, so those show no data rather than a false change. The legend says
  so. A code kept across a small boundary fix still compares slightly different areas.
- **Details panel:** the change, then both periods' values, then the margin note if any.
  Hatching is off on change maps (its grades are for one period's estimate, not a change).

**Open (Robbie).** Wording of the labels ("Down 1.2–5.0 pts", "No clear change"); whether tract
changes across the 2020 boundary change should match by code (default) or wait for a crosswalk;
whether to publish earlier-period margins so the estimate above isn't needed.
