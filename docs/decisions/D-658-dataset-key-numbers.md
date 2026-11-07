# D-658 · Key numbers and full tables on dataset pages

- **Date:** 2026-11-07
- **Status:** DEFAULTED (worker, issue #244, under the lead's calls; the lead decides)
- **PR:** #558

**Decided.**

1. **What.** Under the "Map it" button on `/data/<id>`: the U.S. value, the top three states (#1 larger
   and bold, #2 and #3 smaller and regular) and the top three cities of 100,000+ people, each with its
   ± margin; then "View table of all states" and "View table of all cities", each opening a sortable
   list (name or value) on the page, closed until tapped.
2. **Direction.** "Lowest" only where the registry sets `higherIsBetter: false` and the topic isn't
   about groups of people (Race and ethnicity, Immigration and language, Disability, Income and
   poverty, Social vulnerability, Environmental justice, Population and age); otherwise "Highest".
   No best/worst words. Race and ethnicity maps get no top three at all (the #414 rule: their
   numbers never stand out on their own); the U.S. value and the tables stay.
3. **Fit.** Only maps with a state level and not feature layers. AADT, TIP projects, walkability
   (tract only) and county-only maps such as smoking show nothing new. The U.S. value shows where
   the benchmarks already show one (`US_KINDS`, not counts or categories).
4. **Reliability (D-222).** ACS estimates graded unreliable (CV over 30%) are left out of the top
   three, and a line says how many were left out. The tables list everything.
5. **Data.** States, their margins and the U.S. value come from the published values files, loaded
   in the browser. Cities are the eight maps with `areaLevels: [place]` (D-475); there is no all-cities
   values file, so `apps/web/scripts/big-cities.mjs` (run by hand) writes
   `apps/web/src/generated/cities.json`: incorporated places of 100,000+ in the Census Bureau's
   Vintage 2024 city estimates (341 with a city file; Urban Honolulu is a CDP and has none), with their
   published values. The Census API needs a key now, so the population comes from the public
   estimates CSV, not ACS B01003.
6. **Tables on the page, not the map.** The map's `DataTable` is an overlay tied to flying the map;
   cities are never a map level (D-475), so the map can't list them. A plain 52- or 341-row table on
   the dataset page covers both.

**Known limits.** `cities.json` is a snapshot: re-run the script when `ingest areas` refreshes (or have
that step publish it to R2). Smoking (and other county-only maps) shows nothing because there are no
state values.

Lead: — · Ponytail: — · Outcome: pending review.
