# D-638 FRA highway-rail grade crossing maps

Date: 2026-11-03. Issue #517, PR #538. Decided by: worker (defaults), for the lead to confirm.

## Decision

Two count maps, state and county, from FRA's public-domain data on data.transportation.gov (no key):

- **Rail crossing crashes** (`rail_crossing_crashes`): Form 57 incidents (`7wn6-i5b9`) at **public**
  crossings, one per incident (joint code 1), by incident year. Headline: the 2021–2025 yearly
  average (as traffic deaths, FARS); single-year stops 1975–2025 (2026 is partial, left off).
- **Rail crossings at street level** (`rail_crossings_public`): today's Form 71 inventory
  (`m2f8-22s6`), open (`crossingclosed` No) public at-grade crossings, leaving out those marked
  "No Train Traffic". One snapshot, no timeline.

New measure kind `fra_crossings` (`field: crashes | crossings`), ingest `data/ingest/src/fra.ts`, step `fra`.

## Why

- **Server-side counts only.** The ingest asks Socrata for `count(*)` grouped by year, state and
  county (paged, 50,000 rows a page, retry on 5xx, plain User-Agent). No narratives, names, ages or
  crossing points are downloaded at all, and the pull is about 65,000 small rows instead of 250,000
  wide ones. The grouped result is cached in `data/cache/` under a dated name, since FRA revises in place.
- **Counts, not rates.** A per-resident rate reads oddly for crossings; a per-crossing rate would need
  the historical inventory per year. Zero is a real value (no crash, or no crossing); the quantile
  classifier already gives exactly-zero its own bottom class.
- **County codes.** FRA uses Census FIPS (state 2 digits + county 3 in Form 57; 5 digits in Form 71),
  checked against the Census population-estimate county lists for each year (pre-2020 on 2019
  counties, as FARS). Mismatches: Connecticut uses its old counties in every year and in the
  inventory, so its counties show no data from 2020 on and on the inventory map; Alaska has a few
  retired codes (pre-1987 Aleutians, Skagway-Yakutat-Angoon, Valdez-Cordova), which blank its
  counties in 1976, 1979 and 1993 and on the inventory map (the FARS rule: over 5% of a state's count
  under codes not on the map). Dade → Miami-Dade and the other `FIPS_RENAMES` apply.
- **Deaths left out.** In a single year about 92% of counties would show 0 deaths; a county deaths
  map doesn't read clearly. Easy to add later as a third `field` from the same query.
- **Insights off** for both: raw counts follow county size and rail mileage.

## Sanity (local fetch, 2026-11-03)

All crossings (public + private), 2024: 2,268 incidents vs Operation Lifesaver/FRA 2,264; Texas 283 vs
283; California 186 vs 185. Public only, U.S.: 1975 11,350; 2000 3,113; 2019 1,930; 2024 1,897; 2025
1,925. Inventory: 123,630 open public at-grade crossings (Cook County 837, Los Angeles 806).
