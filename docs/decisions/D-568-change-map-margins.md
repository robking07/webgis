# D-568 · Change maps: real margins for states, counties and tracts

- **PR:** #468 (closes #188). Replaces D-252's "Margins actually tested" bullets.

**Decided (worker defaults).**
- **Source.** An ACS change map loads both periods' published margins, `values/<id>/[<stop>/]<level>.moe.json`
  (D-257, published by the Data run, D-557), for states and counties at once and tracts once tracts are
  wanted. The margin of the change is √(MOE₁² + MOE₂²) per area; the earlier margin is no longer estimated.
- **Any pair of periods.** The test no longer needs the later period to be the default: every stop has its files.
- **Tracts use the national file, not the per-county shards.** One ≈0.4 MB (gzipped) file per period
  instead of a shard per county in view, so the test no longer depends on the counties the map reports;
  `watchCounties` is now only for fitted breaks (D-564).
- **Missing file.** A level whose margin file is missing or fails isn't tested: no grey, and the legend
  says "No change" (exact zero only), the behavior counties had before. No crash, no false "no clear change".
- **One test everywhere.** The details card's "within the margin of error" note now uses the map's class
  (it ran its own estimate before), so map, hover, details and legend agree (D-545).

**Effect.** At county level many changes are within their margins (pct_poverty 2015–2019 → 2020–2024:
2,312 of 3,211 counties), so county change maps show much more of the grey middle (D-516). That is the
honest reading of the survey.
