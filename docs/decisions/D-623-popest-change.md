# D-623 · Population change and migration maps

PR #523, closes #515. Four People maps from the Census Population Estimates, state and county:
`popest_change` (% since the 2020 Census, July 1 of 2021 to 2025), `popest_domestic_migration`,
`popest_international_migration` and `popest_natural_change` (the Census Bureau's own rates per
1,000 residents, 2011 to 2019 and 2021 to 2025). New `measure.kind: popest` and unit `per_1k`;
ingest in `data/ingest/src/popest.ts` beside the FARS population reader.

- **Defaulted (worker): earlier decades.** The rate maps carry 2011 to 2019 from the Vintage 2020
  file (`co-est2020-alldata.csv`, built on the 2010 Census). 2020 is left out (it is the seam: base
  year of one vintage, partial year of the other). Stops before 2020 use the 2019 boundaries, so
  Connecticut shows its old counties through 2019 and planning regions from 2021 (existing
  change-map rule: those counties show "no change" across the seam). "Since 2020" has no 2010s
  stops (it would be "since 2010", a different measure). 2000 to 2010 not added: components are in
  51 per-state files (`shortcut:` in the registry).
- **Defaulted (worker): symbology.** Manual breaks, diverging brown-teal ramp with a neutral middle
  class around zero for change, domestic migration and natural change; sequential blues for
  international migration (almost never negative). Quantile classes would hide the zero.
- Migration is modeled, not counted; the notes and the new glossary term `population-estimates` say so.
