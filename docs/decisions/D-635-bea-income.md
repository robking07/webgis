# D-635 · BEA personal income per person

PR #535, closes #519. One Economy › Income and poverty map, state and county, every year 1990 to
2024: `bea_income_per_person` (BEA table CAINC1, line 3, per capita personal income, 2024 dollars).
New `measure.kind: bea_income`, ingest `data/ingest/src/bea.ts`, Data run step `bea` (and
`timeline` for the year stops). Follows the QCEW pattern (D-629).

- **Defaulted (worker): BEA's own per-capita line**, as published (BEA's population), not
  recomputed. Years before 2024 are restated with the CPI-U (D-36); the 2024 default is as published.
  The legend's inflation note is on through `restatesDollars` in `apps/web/src/lib/periods.ts`.
- **Defaulted (worker): slider starts 1990**, not 1969: the CPI-U table in `util.ts` starts at 1990.
  Adding 1969-1989 CPI-U values would extend it with no other change.
- **Lead call: combined areas are spread over their members.** BEA joins 23 Virginia counties with
  their independent cities (e.g. Fairfax + Fairfax City + Falls Church) and Maui with Kalawao; each
  member place shows the group's figure (`BEA_GROUPS` in `bea.ts`, member FIPS from BEA's footnote
  and the Census county list). Old Alaska divisions and Shawano + Menominee stay no data. A city's
  own income is not known, so the note says each place in a group shows the group's figure.
- **Skipped: real GDP (CAGDP9).** It is in chained 2017 dollars (not the 2024 dollars of every other
  money map), is counted at the workplace so a per-resident figure misleads in commuter and energy
  counties, needs a second population source, and growth rates swing wildly in small counties.
  Better as its own item (GDP by industry, or growth over 10 years for metro areas).
- **Connecticut:** BEA has the old counties through 2023 and the nine planning regions in 2024, so
  stops before 2024 use the 2019 boundaries, as for QCEW.
- **Download:** the 3.4 MB zip is read with the range-request helper (`remoteZipEntry`); the file is
  cached in `data/cache` and not re-fetched until deleted. BEA revises recent years yearly.
- **Wording:** the description separates this from the Census "Income per person" map (survey
  household cash income vs. BEA's tax and program records, including Social Security and investment income).
