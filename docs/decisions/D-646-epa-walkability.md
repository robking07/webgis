# D-646 EPA walkability index on 2010 tracts

Date: 2026-11-04. Issue #521, PR #546. Plan by the lead and ponytail vote; details defaulted by the worker, for the lead to confirm.

## Decision

One map, **Walkability index** (`walkability_index`): EPA's National Walkability Index (Smart Location
Database 3.0, June 2021 release), 1 to 20, at **tract level only**, as a `features` polygon layer on the
2019 cartographic tracts (= 2010 tracts), the way the food access tract maps are drawn.

- **Source file:** EPA's own `WalkabilityIndex.zip` (`Natl_WI.gdb`, layer `NationalWalkabilityIndex`,
  220,739 block groups). It is the SLD 3.0 subset EPA publishes for the index (425 MB, against 553 MB for
  the full SLD) and carries everything needed: `NatWalkInd`, `TotPop` and the `STATEFP`/`COUNTYFP`/`TRACTCE` parts.
- **Roll-up:** tract value = sum(`NatWalkInd` × `TotPop`) / sum(`TotPop`) over the tract's block groups,
  rounded to 0.1. Block groups with no residents add nothing; tracts with no residents (451) show no data.
  The SQL is the registry `select`; `walkability.test.ts` runs it on a small table.
- **Join key:** `STATEFP || COUNTYFP || TRACTCE`, not `GEOID10`. EPA's parts carry the 2019 county codes the
  tiles use; `GEOID10` keeps three retired ones (Bedford city VA 51515, Wade Hampton AK 02270, Shannon SD
  46113; 73 block groups). With the parts, all 73,868 tiles tracts match; the 264 SLD tracts left over are
  water-only `99xxxx` tracts. Connecticut stays on its old (2010) tracts and counties.
- **Colors:** EPA's four groups as manual breaks (1–5.75 least walkable, 5.76–10.5 below average,
  10.51–15.25 above average, 15.26–20 most walkable; from the NWI user guide, June 2021), `ylgnbu`,
  higher is better. The popup also names the group in words (`band`), applied to the tract average.
- **Unit:** `ratio` (a plain number, as the Gini index uses) rather than a new `index` unit.
- **Placement:** Transportation › Commuting, next to walking to work, with a link to `pct_walk_commute`.

## Caveats written into the notes

A model of the built environment, not a survey: intersection density (2018 HERE streets), distance to
the nearest transit stop (2020 GTFS, only agencies that publish schedules; 126,392 of 220,739 block groups get the lowest transit rank),
job mix and job-and-home mix (2017 LEHD jobs, 2014–2018 ACS households). No data on sidewalks,
crossings or safety. The weights in the population average are 2014–2018 ACS residents (EPA's
`TotPop`, "Population, 2018"), not the 2010 Census.

## Not done (shortcut)

Block-group detail, county and state roll-ups, a 2010→2020 crosswalk and the other SLD fields are out
of scope (lead's plan). Block groups would need 2010 block-group tiles.
