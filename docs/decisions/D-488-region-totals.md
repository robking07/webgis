# D-488 · Totals for a focused MPO

- **Date:** 2026-10-29
- **Status:** DEFAULTED (worker, for the lead)
- **PR:** #388 (issue #292)

With an MPO in focus (`mpo=`), the panel under its name shows the area's own number for the map(s)
on screen, built from the county counts the ingest already publishes
(`values/<id>/county.counts.json`). No new database query and no R2 upload.

**Which maps get a total.** Exactly the maps with counts in `relations.yaml` (`countsSpec`). Every
other map (medians, indexes, CDC PLACES and other modelled rates) says "Can't be added up across
counties, so this area has no total." Point and line maps get no panel.

**The math** (ACS General Handbook, 2020, ch. 8 "Calculating Measures of Error for Derived
Estimates"):

- Sum: estimate = Σ counties; MOE = √Σ MOE². A missing county row means no total, never a short one.
  Full counts (2020 Census, FARS, LODES, TRI) carry no margin and say so.
- Percent maps: the area's rate is Σ numerator ÷ Σ denominator, with the Bureau's proportion formula
  MOE = √(MOE_x² − p²·MOE_y²) / y, falling back to the ratio formula when the root is negative
  (the existing `shareOf`, as in Compare places).
- Ratio maps that aren't percents (mean commute minutes, traffic deaths per 100,000) show their summed
  counts only (`shortcut:` comment in `RegionTotal.tsx`).
- Counts are the default period's; the heading names that vintage.

**Which counties an MPO holds.** New committed file `apps/web/public/mpo/counties.json` (ingest step
`mpo-counties`, also run by `mpo`): for each MPO, the share of each county's 2020 residents who live
inside it, from Census 2020 tract population centroids (CenPop2020, public domain) tested against the
MPO shapes already in the repo. A county counts in full when at least half its residents are inside,
otherwise not at all. The total is **exact** when every county it touches is wholly inside, and
**approximate** otherwise; the panel names the counties counted and each cut county with its share
inside. 125 of 411 MPOs are whole counties.

The Met Council (27197300) is approximate under this rule: the federal MPO boundary (BTS NTAD) also
takes in about a quarter of Sherburne and Wright counties' residents, so the total is the 7 counties
(as a staff report would use) with that difference stated.

**Not built (follow-ups):**

- A picker for an arbitrary set of counties: the sum works on any county list, but there is no UI to
  choose one yet.
- Tract-level totals for cut counties: `values/counts/tract/<county>.json` already holds tract counts,
  so summing the tracts inside the boundary would give a near-exact total for cut MPOs.
- Connecticut MPOs: 2020 tracts use the old CT counties, so they match no 2022+ county counts and show
  "a county's numbers are missing".

## Amendments

- 2026-10-29 (lead review): map-first. Visible: heading, the number ± MOE, one count line and one status line ("Approximate · 7 counties; leaves out parts of Sherburne and Wright"). The county list, the half rule and the 90% note sit behind a closed "How this is counted" disclosure. Maps that can't be added up get one line. Questions 1–4 in the PR decided by the lead: MPO only (county picker and tract sums are follow-up issues), the half rule and the "Exact" basis stay, non-percent ratios show sums only.
- 2026-10-29 (PR #395, issue #390): **tract sums for cut counties.** `mpo/counties.json` now lists, for
  each county an MPO cuts (share under 1), its 2020 tracts inside: `[county, share, [6-digit tracts]]`.
  A tract is inside when its CenPop2020 population center is (tracts with no residents use the same
  point, so job-only tracts count). The total for each count map is the whole counties plus those
  tracts' rows from `values/counts/tract/<county>.json`, combined with the same `sumCounts` (√Σ MOE²) and
  `shareOf`. Status: "Near-exact (tracts) · 7 whole counties and tracts inside Sherburne and Wright".
  If any needed tract row is missing (maps with no tract counts such as TRI and traffic deaths, tracts
  with no commuters on mean commute, Connecticut), that map falls back to the half rule above, labelled
  "Approximate" on its own row. Limits: tract-centroid membership, not area or block weighting; summing
  many tract MOEs widens the margin (Met Council's poverty universe MOE goes from about ±1,180 for 7
  counties to ±2,606 with 9 tracts added), as the ACS Handbook warns for aggregates of many estimates.
  The file grew from 20 KB to 183 KB (43 KB gzipped), loaded only when an MPO is in focus.
