# D-477 · PLACES at tract level; uninsured under 65 from SAHIE beside the ACS map

- **Date:** 2026-10-28
- **Status:** PROPOSED (worker defaults; the lead decides, Robbie on the starred items)
- **PR:** #377 (issue #362)

**PLACES tracts.** Ten PLACES maps gain a tract level from CDC's 2025 tract release
(`cwsq-ngmh`): diabetes, obesity, high blood pressure, asthma, depression, smoking, physical
inactivity, fair or poor health, mental distress, heart disease. The release uses 2020 tracts with
Connecticut's planning-region codes, the same as Mapwich's tract tiles (2024 Gazetteer). Adding
all 38 PLACES measures would grow Los Angeles's tract click file from 4.13 MB to 6.13 MB
(1.26 → 1.82 MB gzipped, +48%); these ten add 0.50 MB (1.40 MB gzipped, +11%). The other 28 are a
follow-up, one line each in the registry once the size is acceptable.

\* **Tracts are crude, counties age-adjusted.** CDC publishes tract values as crude prevalence
only. County maps keep age adjustment (unchanged live numbers); each description now says
"age-adjusted for counties but not for tracts". Alternative: switch these ten county maps to
crude too, so every level of one map means the same thing, at the cost of changing ten live maps
and their Combinations pairs.

\* **SAHIE sits beside `pct_uninsured`, not in place of it.** New map `uninsured_under_65`
(SAHIE 2024, states and counties, 90% margins, labeled model-based). `pct_uninsured` (ACS
2020–2024) keeps its tract and block-group levels, its timeline and every existing link; SAHIE has
neither tracts nor all ages (people 65+ are out of its universe). A `links` entry in
`relations.yaml` ties the two. When the ACS stops asking about insurance, `pct_uninsured` simply
stays at 2020–2024.

**SAHIE source.** The Census API now refuses requests without a key, so the ingest reads the
yearly CSV from www2.census.gov instead (`sahie-<year>-csv.zip`, no key). New `measure.kind:
sahie`; Census work, public domain (17 U.S.C. § 105).
