# D-587: Traffic deaths step back to 1975

PR #487, part of #479. `traffic_fatalities` timeline is now 1975 to 2024 (single years; the
2020 to 2024 average stays the default), state and county.

- **Population before 2020 is the Census county estimate for that year** (July 1; 1970s and 1980s
  tables, 1990s CO-99-8, 2000s intercensal, 2010s vintage 2019), new `data/ingest/src/popest.ts`.
  No key. Estimates are only for this dataset's denominator; 2020 on still uses ACS.
- **This also replaces the 2015 to 2019 denominator** (was 2015 to 2019 ACS for every one of those
  years). Those five years' rates change slightly. It also removes the need for
  `population_density`'s 2019 stop on disk, so `timeline` for FARS now runs on GitHub (check-run).
- **County codes** carried to 2019 boundaries with `FIPS_RENAMES`, now incl. Dade to Miami-Dade,
  Clifton Forge and South Boston (summed into their counties). Counties absent from 2019
  boundaries are dropped; if over 5% of a state's deaths sit under such codes the state's counties
  show no data (existing rule): Alaska 1975 to 1985. States always have a value.
- 1990s postcensal estimates are not revised to the 2000 Census, so a small step at 1999 to 2000
  is possible. Two garbled cells in the Census file (Sevier UT 1994, Windsor VT 1993 to 1994) are
  filled with a straight line.
