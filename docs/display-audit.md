# Dataset display audit

Run with the `dataset-display-review` skill (`.claude/skills/dataset-display-review/SKILL.md`). Last full pass: **2026-10-01**, 27 datasets (D-26). 2026-10-01: 27 ACS datasets added and reviewed in a browser (D-113). 2026-10-02: the three 2020 Census datasets and block-group/block levels (D-124).

## Fixed in this pass

| Problem | Where | Fix |
|---|---|---|
| Route shown as a state LRS id ("0100000000000094-I") | Traffic volume popups | Readable `route` derived in the HPMS extract: "I-94", "US 52", "MN 55", "County Rd 42", plus "Business/Bypass/Truck/…" qualifiers; street name for unsigned roads (title-cased when a state publishes capitals). Segment title = route, else street. |
| Functional class shown as a code | Traffic volume | Facet labels ("Minor arterial"), filter chips, explainer |
| No way to isolate road types | Traffic volume | Facets: **Road type** (Interstate / U.S. / State / County / City or local) and **Functional class** (7 classes), each with an ⓘ explainer and per-value descriptions; hidden behind "Display options" |
| Program acronyms as vintages ("BRFSS 2023", "NBI 2025", "FARS 2020–2024", "HPMS 2024") | Dataset list, card, legend | Plain vintages ("2023 data", "2025 inventory", "2020–2024 average", "2024"); program names stay in the source line |
| Raw unit codes (`deg_f`, `per_100k`, `per_sq_mi`) | `/data/<id>` | `UNIT_LABEL` words ("degrees Fahrenheit", "per 100,000 residents", …) |
| No explanation of estimates, MOE, age adjustment, normals, bridge ratings, rates, VMT, LODES, classes | Everywhere | `glossary.yaml` (15 terms) attached to all 27 datasets; shown via the card's ⓘ and the profile's "Explainers" |
| Table stuttered at county level (3,100 rows re-rendered on every hover/move) | Table view | Windowed rows + memoized table; rows are buttons that fly the map to the place and open its details |
| No control over geography level | Map | "Display options › Geography level": Auto (by zoom) or a pinned level, kept in the URL (`lv=`) |

## Per-dataset status

| Dataset | Readable values | Explainers | Facets | Opportunities (not built) |
|---|---|---|---|---|
| Traffic volume (AADT) | ✓ route labels | AADT, functional class, road type | road type, functional class | NHS / truck-route facet; trucks share as a value toggle; peak-hour later |
| Vehicle miles per resident | ✓ | VMT, AADT, classes | – (choropleth) | drill-down to the AADT segments in the county |
| Traffic deaths | ✓ | rate per 100k, classes | – | **FARS crash points** underneath (facets: year, person type, light/weather, road type) |
| Bridge deck area in poor condition | ✓ | bridge condition, classes | – | **NBI bridge points** underneath (facets: condition, owner, year built, carries interstate?) |
| Job density | ✓ | LODES, geography, classes | – | jobs by industry/wage family (LODES CNS/CE columns) |
| 12 ACS measures | ✓ | ACS 5-year, MOE, geography, classes | – | **families**: commute mode (transit/walk/bike/WFH), commute time. Block groups built for 11 (D-124; mean commute has no block-group table) |
| 6 CDC PLACES measures | ✓; coverage notes name the missing states (KY/PA have no 2023 survey data; loneliness covers 40 states + DC), #25 | model-based, age-adjusted, MOE, classes | – | **family**: health behaviors; tract level exists in PLACES (needs 2020-tract check); KY/PA backfill from the 2024 release (2022 data) if Robbie wants mixed years |
| CEJST disadvantaged tracts (2010 tracts) | ✓ burdens listed in words | CEJST, 2010 tracts | status | per-category facets (8 burdens), tract 2010→2020 crosswalk |
| Residents in disadvantaged communities (CEJST) | ✓ | CEJST, 2010 tracts, classes | – | pairs naturally with poverty, PLACES health, climate |
| 287(g) agreements (DDP) | ✓ "N agreements" | 287(g) | – | agreement model (Task Force / Jail / Warrant) family; time slider (history back to 2002); kept out of Weird Insights |
| 4 NOAA climate normals | ✓ | climate normal, classes | – | **family** with a season/month selector |
| 8 race & ethnicity shares (ACS B03002, D-113) | ✓ plain group names, "(non-Hispanic)" spelled out | race and Hispanic origin (incl. 2020 coding change), ACS 5-year, MOE, geography, classes | – | **family** (switch group from the card); a diversity index; dot-density view; kept out of Odd Pairings |
| 19 more ACS measures: nativity, language, age, income, jobs, education, housing costs, insurance, commuting (D-113) | ✓ | median, inflation-adjusted, Gini, unemployment rate, rent burden, limited English, plus the ACS set | – | **families**: commute mode now also drive alone/carpool; education ladder; housing cost (rent, value, burden). Block groups: published for 25 of the 27 D-113 datasets, not built yet (D-124) |
| 3 2020 Census counts: residents per sq mi, homes per sq mi, share of homes vacant (D-124) | ✓ vintage "2020 count"; blocks named "Block 1001, Tract 101.02" | 2020 Census (privacy noise in block counts), geography (now covers block groups and blocks), classes | – | **family** with the ACS population density (same idea, survey vs count); vacancy split (seasonal vs for rent/sale) needs the DHC file, not P.L. 94-171 |

## Opportunities, ranked

1. **Point layers under rates** (crashes under traffic deaths, bridges under bridge condition): the most natural "dig deeper" step. Needs point styling on the feature-layer kind.
2. **Dataset families** (switch commute mode, health behavior or climate month from the card instead of the list).
3. **Finer geography**: built (D-124): block groups for ACS and the 2020 Census, blocks for the 2020 Census. Left: block groups for the D-113 ACS datasets.
4. **Place-first entry** (pick a place, then see a short, curated set of its numbers). See `docs/roadmap.md`.
