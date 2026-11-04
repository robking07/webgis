# D-629 · BLS QCEW maps: pay per job and jobs per resident

PR #529, closes #516. Two Economy › Jobs maps from the BLS Quarterly Census of Employment and Wages,
state and county, every year 1990 to 2025: `qcew_avg_pay` (average annual pay per job, 2024
dollars) and `qcew_jobs_per_1k` (jobs per 1,000 residents). New `measure.kind: qcew`, ingest
`data/ingest/src/qcew.ts`, Data run step `qcew` (and `timeline` for the year stops).

- **Defaulted (worker): jobs per 1,000 residents, not 10-year job change.** The change map
  (D-252) already turns any map with year stops into a change: Job density (LODES, per square mile,
  2002–2023) shows % job change between any two years, so a QCEW "change vs 10 years earlier" map
  would mostly repeat it. Jobs per resident is new next to it: it separates job centers (above
  1,000) from bedroom and retirement counties, and its own change map works too.
- **Defaulted (worker): the file.** The yearly "annual by industry" zip (35–145 MB) holds one CSV
  per industry; only `10 Total, all industries` (~4 MB) is read, with HTTP range requests
  (`remoteZipEntry` in `zip.ts`, through unzipper's `Open.custom`). The open-data API files start
  in 2014, so they can't give the history. Rows: `own_code` 0 (all ownerships), `agglvl_code` 50
  (states) and 70 (counties). Pay is `total_annual_wages` ÷ `annual_avg_emplvl`, the same as BLS's
  `avg_annual_pay` (checked: Hennepin $90,157, Santa Clara $197,043, Cook $86,931 in 2024).
- **Defaulted (worker): dollars.** 2024 dollars with CPI-U annual averages, like every other
  money map (D-36), so the 2025 default reads 2.6% below BLS's own figures (the note says so). The
  CPI-U table moved from `acs.ts` to `util.ts` and now has every year 1990–2025 (BLS API, series
  CUUR0000SA0, M13).
- **Defaulted (worker): stops every year.** About 60 KB per county file; 36 years × 2 levels × 2
  maps is ~9 MB, small enough.
- **Withheld figures** (`disclosure_code` N) are no data, never zero. At the all-industries county
  total this is rare (none in 1990, 2000, 2020, 2024 or 2025; one in 2010).
- **Connecticut:** BLS keeps its old counties through 2023 and uses planning regions from 2024, so
  stops before 2024 use the 2019 boundaries. The population estimates have no old-county figures
  for 2020–2023, so the jobs rate has no Connecticut counties then (pay is unaffected), as for
  building permits (D-625).
