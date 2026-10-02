# D-113 · Census expansion (27 ACS datasets) and tract values in static files

- **Date:** 2026-10-01
- **Status:** DECIDED (Robbie: storage model, "tiers 1–2 now") / DEFAULTED (dataset list, Odd Pairings exclusions; built in prototype-style momentum as a full buildout)
- **PR:** #13

**Ask (Robbie).** Greatly expand the Census datasets (race, economic data, more
commuting), inserted with the plain-language methods.

## Storage: why we download, and the three tiers

Loading 27 more tract datasets into Supabase would have needed about 440 MB (each
state + county + tract ACS dataset is about 88.6k rows, about 16 MB; the database was at
305 of 500 MB). That is a SPEC §10 stop, so Robbie was asked. He asked why we don't just
stream from the Census API. Findings: the API does allow browser calls (CORS `*`) but
requires a key (no key now gets a redirect), can't return the nation's tracts in one call
(one call per state; California alone is about 1 s and 333 KB), and quantile colors need
every value before the first is drawn. Margins of error, inflation adjustment and 2010-tract
re-keying would also run in every visitor's browser. Our own copies also protect the map
when federal data is revised, pulled or offline (see D-32).

**Decided (Robbie): three tiers, build 1–2 now.**
1. **Map layers are precomputed static files** (the CDN today, R2 later). They're fast,
   archived and effectively unlimited.
2. **The database stays small and analytical:** state and county values (Odd Pairings,
   place profiles), names, metadata. That's about 0.6 MB per dataset.
3. *(Later)* **The live Census API covers the long tail:** a small server-side proxy (it
   keeps the key hidden and caches) fetches one clicked place's full profile on demand.

**Built.**
- `writeValues` sends the tract level to files: `values/<id>/tract.json` (map colors,
  unchanged shape) and `values/tracts/<county fips>.json` (every dataset's `[value, moe]`
  for that county's tracts, keyed by the 6-digit tract code). Every ingest script
  (ACS, LODES, PLACES, CEJST, …) gets this without changes.
- The web's `fetchDetail` reads the county file for an 11-digit geoid: one fetch per click
  (Hennepin 27053, 40 datasets). States and counties still come from Supabase.
- `npm run ingest -- tracts-out` wrote the 13 existing tract datasets to the files. It
  only touches datasets in this checkout's registry, since the database is shared with
  unmerged branches (`census2020_*` from D-39). The rewritten map files were checked
  value-for-value against git (13/13 identical) and left unchanged.
- **Not yet done:** `npm run ingest -- tracts-out --drop` deletes the database's tract
  rows and runs `vacuum full`. **Run it only after this PR is deployed**, since production
  reads tract details from the database until then. Expected savings are about 200 MB
  (about 16 MB × 13). After it runs, the database holds about 115 MB.
- `docs.ts` counts tract values from the files. `exportRegistry` now also writes
  `generated/glossary.json`, which no step produced before (new terms would have silently
  never reached the site).
- Size: county files total 73 MB for 40 datasets; the largest is Los Angeles (2.1 MB raw,
  0.7 MB gzipped, one fetch per click there). All of `public/data/values` is now about
  275 MB (it was 84 MB), mostly the 27 datasets' three periods of tract files.
  **Follow-up, now important:** move `public/data/values` to R2 (as D-39 does for block
  groups) once that branch merges, so git and every Vercel deploy stop carrying values. Check
  the Vercel preview deploys cleanly at this size before merging.

## Datasets (27, ACS 2020–2024, all with the year control)

Variables were checked against the Census API's variable lists for 2014, 2019 and 2024.
Each steps through 2010–2014 / 2015–2019 / 2020–2024, except limited English (C16002 starts
in 2016, so 2015–2019 onward).

- **Race & ethnicity** (new category; B03002, so every person is counted once and groups
  sum to 100%): Hispanic or Latino; white, Black, Asian, American Indian and Alaska Native,
  Native Hawaiian and Pacific Islander, two or more races (all non-Hispanic); people of
  color (everyone but non-Hispanic white). One neutral ramp (blues), no "better" direction.
- **Population:** born outside the U.S., households with limited English, median age.
- **Income & poverty:** income per person, Gini index, SNAP households.
- **Jobs:** unemployment rate, labor force participation.
- **Education** (new category): bachelor's or higher, no high school diploma.
- **Housing:** median home value, median rent, renters paying 30%+ of income.
- **Health:** no health insurance.
- **Commuting:** drive alone, carpool, 90-minute-plus commutes, work outside home county,
  leave before 7 a.m.

**Plain language.** New glossary terms: `race-ethnicity` (includes the 2020 race-coding
change that inflates "two or more races"), `median`, `inflation-adjusted`, `gini-index`,
`unemployment-rate`, `rent-burden`, `limited-english`. Coverage notes: AIAN and NHPI
(small numbers; "alone" undercounts), multiracial (2020 coding change), home value and
rent (top- and bottom-coded). Reviewed in a browser: tract profile, county profile, maps
at desktop and phone width, `/data/<id>`.

**Checks.** Spot values: Miami-Dade 69% Hispanic and 55% born abroad; Hennepin 54%
bachelor's+; Anchorage 7% AIAN. Race shares sum to about 99% (the rest is non-Hispanic
"some other race", not mapped). No geoids dropped. Database 305 → 320 MB.

**Defaults for Robbie to confirm.**
- The 8 race datasets, born outside the U.S. and limited English carry
  `excludeFromInsights` (kept out of the playful Odd Pairings, like 287(g)); they still map
  and compare in bivariate view.
- Odd Pairings were recomputed with template captions (as all 42 published ones already
  were): 946 pairs, 193 published.
