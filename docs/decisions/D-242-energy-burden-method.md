# D-242 · Energy burden: DOE's ratio of averages, at or below 200% of poverty, fixed 6%/10% edges

- **Date:** 2026-10-08
- **Status:** DECIDED (Robbie: burden formula accepted; lower-income = at or below 200% of the federal
  poverty level; fixed 6% and 10% class edges for the lower-income map)
- **PR:** #142

The DOE LEAD Tool 2022 files give, for each modelled household cohort, *sums*: households, income ×
households, and electricity / gas / other-fuel cost × households, plus a separate household count for
each of those (`HINCP UNITS`, `ELEP UNITS`…), because households whose bill is paid in their rent
have no cost for that fuel. We add cohorts up by tract and roll tracts up to county and state (the
roll-ups equal DOE's own county files), then compute:

- **Burden** = (Σ elec ÷ n_elec + Σ gas ÷ n_gas + Σ other ÷ n_other) ÷ (Σ income ÷ n_income). This is
  DOE's footnoted definition, "average annual housing energy costs divided by the average annual
  household income", with each average over the households that report it. It is a ratio of area
  averages, never an average of household ratios (those explode for near-zero incomes). The
  alternative, Σ all costs ÷ Σ all income, treats bills-in-rent households as paying $0 and reads
  lower (DC, all households: 1.09% vs 1.18%).
- **Lower-income** = at or below 200% of the federal poverty level: the `0-100%`, `100-150%` and
  `150-200%` bands of LEAD's FPL files, Robbie's usual line and a common cut-off for energy
  assistance. U.S.: 9.30% for these households (32.1M of 126.9M). We first used DOE's own line, under 80%
  of area median income (6.30%); DOE's fact sheet quotes 6.7% for that group.
- **One file per state:** all three maps now come from the FPL tract file, so the AMI file is never
  downloaded. The FPL files cover slightly fewer households than the AMI files (126.9M vs 127.5M),
  which moves the U.S. all-households burden from 2.27% to 2.30%.
- **Map classes:** the lower-income map uses fixed edges [6, 8, 10, 15] percent, so 6% ("high") and
  10% ("severe"), the common benchmarks, are class edges. Counties per class: <6: 35, 6–8: 348,
  8–10: 952, 10–15: 1,598, ≥15: 289. [4, 6, 10, 15] was considered but leaves 35 counties in its
  bottom two classes. The all-households burden and the bill stay quantile.
- **Tracts** with fewer than 20 households in the group get no value; counties and states are never cut.
- We fetch only the needed CSV from each state zip with HTTP range requests rather than the 7.3 GB
  of zips. No change-over-time view: DOE says vintage-to-vintage differences are within error.
