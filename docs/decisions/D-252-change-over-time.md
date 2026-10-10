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
  the dated periods before the latest one (newest first, "Off" first). The change always runs to
  the latest period (see the amendment below). URL: `since=<stop id>`; the filter count counts
  it. Comparing two datasets turns it off (as it does the year).
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

**Amended 2026-10-09, Robbie** (review of the first build: "when I am mapping change over time I
only see the values represented in the legend"):
- **Change mode is change everywhere.** The hover card and the details card lead with the change
  ("+2.3 pts", "No clear change", "No data: tract changed in 2020"), with both periods' values
  after it ("12% → 14%" in the hover card, "2015–2019: X · 2020–2024: Y" in details). The table
  (one period's values) isn't offered on a change map (`shortcut:` in `Viewer.tsx`).
- **The year control is off in change mode.** Change always compares the chosen period with the
  latest one (the default, or the newest year when the default is an average or normal). The
  year control stays in place, disabled (`<fieldset disabled>`, `aria-disabled`), showing the
  latest period, with "Comparing A → B. Turn off change to pick a year." under it. It doesn't add
  to the filter count, and a `t=` in a link with `since=` is dropped.

**Amended 2026-10-10, Robbie: Map options (issue #155, options A + B of the panel review).**
This replaces "Where it lives" above and the disabled year control in the 2026-10-09 amendment.
- **"Filters" is now "Map options"** (button, panel heading, phone sheet). Three headed sections in
  this order: **Geography** (the level), **Time**, **Show/hide** (feature layers' facets only).
  Each appears only when the map has something to set there.
- **The button shows a dot**, not a count, when anything differs from the defaults (its label says
  "Map options, changed from the defaults"). A count read as "how many settings" but counted each
  hidden road type. The phone's button is just "Apply".
- **Time starts with a Values / Change switch** in the year buttons' style, only on maps with an
  earlier period to compare with. Values shows the year picker. Change hides it and shows
  "Compare with…" (the earlier periods, as buttons or the slider, like the year picker) and
  "Change from A to B, the latest period." Nothing is greyed out. Turning Change on starts from the
  oldest earlier period (worker default: the longest span, and for ACS the one that doesn't overlap
  the latest). `since=` links keep working and open in Change.
- **"Switch with zoom" is now "Automatic (changes as you zoom)"** (worker wording).
- **Phone and laptop still differ**: the phone's full-screen sheet stages changes until Apply (the
  map is hidden under it); the laptop's sidebar applies at once next to the map. Left as is.

**Open (Robbie).** Wording of the labels ("Down 1.2–5.0 pts", "No clear change"); whether tract
changes across the 2020 boundary change should match by code (default) or wait for a crosswalk;
whether to publish earlier-period margins so the estimate above isn't needed.
