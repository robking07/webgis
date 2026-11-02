# D-590 · Toxic releases step back to 1987

PR #490, part of #479. `tri_onsite_releases` timeline is 1987 to 2024, one stop per reporting year, state and county;
2024 stays the headline. Same measure as D-387 (pounds released on site per square mile).

- **One Basic Data File per year** (`.../mv_tri_basic_download/<year>_US/csv`; the columns are identical from 1987), read
  through the same `triTotals`. About 60 MB each, so a full timeline run keeps about 2.3 GB in `data/cache`.
- **Today's counties for every year.** A facility's county is its current Envirofacts code, so old years are placed in
  today's counties and Connecticut shows no data throughout (as in the headline). No 2019-boundary stops.
- **Coverage note warns about rule changes**: about 286 chemicals added for 1995; metal mines and six other sectors
  from 1998; lower thresholds for lead and other persistent chemicals in 2000 and 2001; PFAS from 2020. A jump is often
  a rule change, not more pollution. 1987 is inflated by one facility reporting 5.2 billion pounds (as filed).
