# D-395 · State and U.S. benchmarks beside a place's numbers

- **Date:** 2026-10-20
- **Status:** DEFAULTED (worker, issue #288, under the lead's D-373 call; the wording and layout are Robbie's to react to)
- **PR:** #295

**Problem.** A planner reading "14.2% in poverty" for a county can't tell whether that is high or
low. Census Reporter shows the state and U.S. value on every row; Mapwich only ranked the place
against every other county.

**Decided.**

1. **One shared line, `components/Benchmarks.tsx`:** "Minnesota 9.6% · U.S. 12.4%", small and muted,
   under each row of the place profile (and the phone drawer's full list, which is the same
   component) and under each value card in the map's details panel. It appears only once a place is
   selected, so the map at rest is unchanged (D-25/D-26). Formatting is `formatValue` with the
   dataset's unit.
2. **State value:** the state's own entry in `details/<state>.json`, which the place's page already
   loads for counties (same file). Not shown on a state's own page.
3. **U.S. value:** `values/<id>/us.json` (D-257). ACS uses the Census Bureau's published U.S. row;
   the 2020 Census, LODES and FARS files are summed counts (numerator over denominator), never an
   average of state rates. Maps with no U.S. file (NRI, CEJST, bridges, energy burden, food access,
   VMT, CDC PLACES, SVI, climate…) show the state only, or nothing. The browser asks for a U.S.
   file only for kinds whose file is on R2 (`US_KINDS` in `lib/benchmarks.ts`), so there are no
   404s. No new ingest code: the writers exist; only some files were never uploaded (below).
4. **What gets none (feature-fit rule):** units `count`, `agreements` (totals aren't like-for-like
   with a state total), `categories` and `percentile` (SVI ranks within the nation, so a state
   figure means nothing). Point and feature maps have no place value, so no row. Puerto Rico gets no
   U.S. value: the Census U.S. totals leave it out (as `parentsOf` in `lib/counts.ts`).
5. **Default period only.** A timeline stop or change card shows no benchmark: the files hold the
   default period, and a mismatched year would mislead.

**Upload needed (lead).** On 2026-10-20 R2 had `us.json` for every ACS map but none for
`census2020_pop_density`, `census2020_housing_density`, `census2020_pct_vacant`, `job_density`
and `traffic_fatalities`, so `US_KINDS` is `acs5` only for now and those rows show the state value
only (lead, 2026-10-20: merge without waiting on the upload). Once #234 step 1 publishes them with
the commands below, add `census2020`, `lodes` and `fars` to `US_KINDS`:

```
npm run ingest -- counts census2020_pop_density census2020_housing_density census2020_pct_vacant job_density traffic_fatalities
npm run ingest -- publish-counts census2020_pop_density census2020_housing_density census2020_pct_vacant job_density traffic_fatalities
```

**Known limit.** One small `us.json` fetch per map on a place page (about 60, cached). A single
bundled U.S. file would cut that to one if it shows up as slow (`shortcut:` in `lib/benchmarks.ts`).

**Not done here.** Compare places "vs state / vs U.S." (follow-up, reusing `lib/benchmarks.ts`);
MPO and focus-area totals (#292); a county benchmark for tracts.
