# D-242 · Energy burden: DOE's ratio of averages, under 80% AMI, tracts summed up

- **Date:** 2026-10-08
- **Status:** PROPOSED (worker defaults; Robbie may change the formula, income line or tract cut-off)
- **PR:** #142

The DOE LEAD Tool 2022 files give, for each modelled household cohort, *sums*: households, income ×
households, and electricity / gas / other-fuel cost × households, plus a separate household count for
each of those (`HINCP UNITS`, `ELEP UNITS`…), because households whose bill is paid in their rent
have no cost for that fuel. We add cohorts up by tract and roll tracts up to county and state (the
roll-ups equal DOE's own county files), then compute:

- **Burden** = (Σ elec ÷ n_elec + Σ gas ÷ n_gas + Σ other ÷ n_other) ÷ (Σ income ÷ n_income). This is
  DOE's footnoted definition, "average annual housing energy costs divided by the average annual
  household income", with each average over the households that report it. It is a ratio of area
  averages, never an average of household ratios (those explode for near-zero incomes).
- The alternative, Σ all costs ÷ Σ all income, treats bills-in-rent households as paying $0 and reads
  lower: U.S. lower-income 6.02% vs 6.30%; DC all households 1.09% vs 1.18%. DOE's fact sheet says
  6.7% for lower-income households nationally; neither reading matches it exactly (the sheet may
  use rounding or an earlier vintage). The ratio of averages is closer and follows the definition.
- **Lower-income** = under 80% of area median income (the 0–30, 30–60 and 60–80% bands), the line
  DOE's fact sheet uses. The poverty-line (FPL) files are in the same zips if wanted later.
- **Tracts** with fewer than 20 households in the group get no value (17 of 9,036 California tracts and 9 of 6,826 Texas tracts
  for the lower-income map); counties and states are never cut.
- We fetch only the needed CSV from each state zip with HTTP range requests (2.4 GB cached instead
  of 7.3 GB). No change-over-time view: DOE says vintage-to-vintage differences are within error.
