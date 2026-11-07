# D-625 · Building permits maps

PR #525, closes #514. Two Housing maps from the Census Building Permits Survey, state and county,
every calendar year 1990 to 2025 (the county annual files start in 1990): `permits_per_1k` (new
housing units permitted per 1,000 residents) and `permits_multifamily_share` (% of those units in
buildings with 5 or more). New `measure.kind: bps`, ingest `data/ingest/src/bps.ts`.

- **Defaulted (worker): which columns.** The Census "estimates with imputation" columns (they fill
  in places that didn't report), not the "reported only" ones. They match Census's published county
  totals (FRED `BPPRIV` series: Maricopa 36,380, Travis 16,990, Hennepin 3,919 in 2024).
- **Defaulted (worker): states from the state files.** The state files are the Census state totals
  and include "balance of state" permits not placed in a county (New Mexico 2,542 units in 2024).
  In the 1990s the county rows sum a little above the state file (Tennessee 1990 by 9%); the state
  file wins at state level. Puerto Rico and other territories are left out (no population estimates).
- **Defaulted (worker): residents.** The Census July 1 estimate for the same year, from the
  existing `estimatedPop` in `popest.ts`, now extended to 2020-2025 (the Vintage 2025 county file
  the population-change maps already read). FARS keeps using it only before 2020.
- **Defaulted (worker): Connecticut.** The county files use its old counties through 2022 and its
  planning regions from 2023, so stops before 2023 use the 2019 boundaries. The population
  estimates have no old-county figures for 2020-2022, so its counties have no data those years.
- **No data vs zero.** A county missing from the file (no permit-issuing place) has no value; a
  listed county that permitted nothing reads 0 per 1,000 and has no share (no units to split).
- **Defaulted (worker): symbology.** Manual breaks so the colors mean the same thing in every year
  and change maps compare like with like: blues at 1, 2, 4, 7, 12 per 1,000; purples at 1, 10, 25,
  50% (over half of counties permit no apartments in a typical year). No minimum-units rule for the
  share; small counties swing, and the note says so.
