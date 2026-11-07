# D-634 · FHFA House Price Index: home price change over 10 years

PR #534, closes #518. One Housing › Costs map, state and county, a stop for every year 1996 to 2025:
`fhfa_hpi_change_10yr`. New `measure.kind: fhfa_hpi`, ingest `data/ingest/src/fhfa.ts`, Data run
step `fhfa` (and `timeline` for the year stops).

- **Defaulted (worker): % change over 10 years, not the index.** The index is relative to an
  arbitrary first year (100). The map shows (index in year ÷ index 10 years earlier − 1) × 100;
  stop "2015–2025". Skipped "change since 2000": it would be a second ramp of the same file with a
  base that never moves, and 25 stops of 2000-based change add little. The file's 2000-base column
  makes it cheap to add later.
- **Defaulted (worker): not adjusted for inflation.** It is the price change as it happened, and the
  coverage note says so. A CPI-U restatement would need the legend's "2024 dollars" note logic,
  which is for dollar units only, and CPI_U starts in 1990 (county data from 1986).
- **Defaulted (worker): diverging brown-teal, manual breaks -10 / 10 / 50 / 100 (popest approach).**
  Prices did fall: 10-year change was negative in 379 of 2,716 counties in 2015, and the national
  middle is roughly +85% in 2025. The middle shade is "within 10%". Fixed breaks keep the colors
  comparable across years.
- **Source file:** `hpi_at_state.xlsx` and `hpi_at_county.xlsx` (released 2026-03-31), read with
  the existing xlsx reader in `airquality.ts`. Cached as `fhfa-hpi-<level>-<release>.xlsx`; bump
  `RELEASE` in `fhfa.ts` with a new release. The continuous `HPI` column is used, since the
  1990- and 2000-base columns are blank for early years.
- **No data, never zero:** counties with no index for either year (about 100 in 2025, 79 more
  early on) are absent from the sheet and show no data.
- **Connecticut:** FHFA's county file already uses the nine planning regions (09110 to 09190) for
  every year, so there is one series and no old-county stops.
- **Not a Census-style estimate:** conforming mortgages only; FHFA calls county figures
  developmental. The coverage note says so.
