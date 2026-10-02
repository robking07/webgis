# D-131 · Block groups for the remaining ACS datasets

- **Date:** 2026-10-02
- **Status:** DEFAULTED (worker for the project lead; issue #29). Follows D-124's "Open" item.
- **PR:** #31 (issue #29)
- **Builds on:** [D-124](D-124-block-groups.md) (block groups and blocks), D-113 (the 27 ACS datasets), D-35 (tracts stay the ACS default)

**Checked.** Every variable of the 28 ACS datasets that still stopped at tracts was requested at
`for=block group:*` from the 2020–2024 ACS 5-year API (the headline vintage), Hennepin County, MN.
A table the Census Bureau doesn't publish at block groups answers 200 with every value `null`.

**Built: 25 datasets gain block groups, all from their own tables (no substitutes needed).**
Labor force participation, unemployment rate (B23025); median home value (B25077); median gross rent
(B25064); median age (B01002); income per person (B19301); the eight race and ethnicity shares
(B03002); bachelor's or higher and no high school diploma (B15003); renters paying 30%+ (B25070);
limited English (C16002); SNAP households (B22010); no health insurance (B27010); drive alone and
carpool (B08301); 90-minute-plus commutes (B08303); leave before 7 a.m. (B08302); work outside home
county (B08007).

Same pattern as D-124: `npm run ingest -- acs-bg <ids>`, values and MOEs in
`data/tiles/values/<id>/block_group[.moe].json`, uploaded with `publish-values` (new keys only).
Block groups use the headline period only; the year control's earlier periods stay at tracts and
above, as for D-124's eleven. Every entry now sets `defaultLevel: tract` explicitly (Robbie, D-35).

**Left at tracts (3), said in each `coverageNote`:**

| Dataset | Table | Why |
|---|---|---|
| Gini index | B19083 | Not published at block groups. No equivalent: a Gini index can't be rebuilt from income brackets without changing the measure. |
| Born outside the U.S. | B05002 | Not published at block groups. B05001, B05003, B05006 and B05012 (every nativity table) are also tract-and-up. B99051 is an allocation table with no margin of error, so not a substitute. |
| Mean travel time to work | B08013 / B08012 | Neither is published at block groups. B08135/B08136 come back mostly null. A mean estimated from B08303's time brackets would be a different measure. |

**Wording.** Coverage notes for median rent and median home value now say that block groups with too
few renters or owner-occupied homes show no median (the Census Bureau suppresses them: in Hennepin,
rent is published for 678 of 1,098 block groups). The AIAN and NHPI notes mention block groups.
