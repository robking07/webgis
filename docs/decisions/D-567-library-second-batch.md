# D-567 · The Library's second batch: 110 maps, not 300

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker), for the lead.
- **PR:** #467 (issue #373). Pipeline and checks unchanged from D-521 and D-536.

## What was added

110 recipe lines in `data/registry/library/acs-profile.yaml`, using the same checks, labels and
reliability rule as the pilot. That makes 213 Library maps in all.

- **40 Data Profile cells** that the pilot left out: the missing bands for home value, owner costs,
  rent, year built, move-in year and household income; homes without plumbing, kitchen or phone;
  severe crowding; boats and RVs; coal, solar and no heating fuel; homeowner vacancy; ages 5–19;
  born in this state or another state; moved within the county; armed forces; wholesale,
  information and other-services industries.
- **70 detailed-table shares**, where a planner question has no profile cell: 22 occupation
  groups (C24010), 8 finer industries (C24030), 5 kinds of employer (nonprofit, local, state or
  federal government, incorporated business owner; B24080), 7 transit and other commute modes,
  3 commute-time bands, 2 departure-time bands, marital status (4), household size (2),
  multigenerational households, young adults living with their parents, adults living with roommates, group
  quarters, private K–12 school, investment income, smartphone, tablet and free internet, vacation
  homes and other vacant homes, condo owners and single-family renters, young renters, second
  mortgages, and severe (50%+) rent and owner cost burden.

## Why not ~300

The Data Profiles have 543 percent cells. Without the sensitive topics (#422: race, ancestry,
foreign birth and citizenship, language, disability, insurance, poverty, grandparents, SSI), what
remains is mostly totals, near-duplicates of Featured maps (vacancy, SNAP, broadband, graduate
degree, commute modes, renters) and pure complements (owner/renter, with or without a mortgage,
in or out of the labor force). The pilot already used most of the good cells. The brief said to
ship fewer rather than pad, so the rest come from detailed tables where a share answers an
everyday question. More detailed-table splits (each occupation by sex, rooms on top of bedrooms,
family-income bands on top of household-income bands) would be padding.

## Not done here

- **The check run.** The worktree guardrail blocks naming `.env.local`, so the worker could not
  run `npm run ingest -- library` with the Census key. Entries were written with `--offline`,
  and `registry:validate` fails on them until someone with the key runs the check on this branch,
  commits the results, then regenerates `registry.json` if any map was left out (as for the pilot,
  b71778e).
