# Data at scale: Library maps (research notes, R4)

Status: §1 sources done.
Next: §2, how the Library tier works on today's foundation and what breaks at 1,000 / 10,000.

Planning research for the next phase. Not a plan; the lead harvests it. Sizes: S ≈ 100k tokens,
M ≈ 275k, L ≈ 500k, XL = several L.

## 1. Sources that could feed Library maps

**Bottom line.** Five federal sources can each feed hundreds of sensible Library maps from one
generic ingest per source: ACS (Data Profiles first, then detailed tables), HRSA's Area Health
Resources File, CDC PLACES at tract level, USDA ERS county atlases, and Census/BLS/BEA economy
series. Together that is roughly **2,500–4,000 maps that make sense**, before counting every
race-iteration or age split. A data.gov "sweep" is the weakest route: its catalog API is down or
moved (below), and most of its records (historically a few hundred thousand) are local files, not nationwide maps.

What "plausible map" means here: one value per state, county or tract, nationwide, that a planner
could read without a codebook (a share, a rate, a median, a density), not a raw count and not a
near-duplicate (e.g. "% male" next to "% female").

### Counts measured today (2026-10-27)

- **ACS 5-year 2020–2024 detailed tables** (from `api.census.gov/data/2024/acs/acs5/groups.json`):
  1,199 tables, 27,149 estimate variables. Of those: 555 base "B" tables (19,897 variables),
  432 race iterations (the same table for each race group, `B19013A`…`I`), 36 collapsed "C" tables,
  111 quality and allocation tables (not maps). By subject: housing 132 base tables, commuting 58,
  income 52, group quarters 38, poverty 26, industry and occupation 26, migration 25, the rest under
  20 each. 78 tables are medians, 52 are aggregates. 219 base tables have 12 or fewer cells.
- **ACS Data Profiles** (`acs5/profile`): **542 ready-made percent variables** (DP02 social, DP03
  economic, DP04 housing, DP05 demographic), each with its own margin of error, down to tract (not
  block group). This is the cheapest big win: the Census Bureau already chose the denominator, so
  automatic shaping only has to write a title. Net of complements and "100%" totals, about
  **350–400 maps**.
- **ACS Subject tables** (`acs5/subject`): 84 tables, 19,085 variables, ~3,900 labelled percent.
  Overlaps heavily with the profiles; useful later for age- and sex-specific rates.
- **CDC PLACES 2025 release** (data.cdc.gov, Socrata, no key): **40 measures** in 6 categories, at
  county (`swc5-untb`), place, ZCTA and **tract** (`cwsq-ngmh`, ~83,500 tracts). Mapwich has 38 at
  county. Missing: `ACCESS2` (no health insurance, ages 18–64, a modelled rate, which partly
  covers the ACS insurance gap, see §5) and `FOODSTAMP`. Tract level for all 40 is the single
  cheapest Library batch: the ingest exists, it needs a tract path.

### Source table

Plausible maps are my estimate. Licence "PD" = U.S. Government work, public domain (17 U.S.C. §105).
Keys are all free; they go in `.env.local` only.

| Source | Plausible maps | Levels | Licence | Updates | Access, key |
|---|---|---|---|---|---|
| ACS 5-yr Data Profiles | 350–400 | state, county, tract (+ place, ZCTA, school district) | PD | annual (Dec) | Census API, key (have one) |
| ACS 5-yr detailed tables (beyond profiles) | 800–1,500 (shares from B tables; ×9 race iterations for the most-used 50) | state → block group for ~60% of tables | PD | annual | Census API, key |
| Census decennial 2020 DHC + P.L. 94-171 | 150–250 (household type, age, tenure by race, group quarters) | down to block for many | PD | static (2030 next) | Census API |
| Census population estimates (PEP) | 15–25 (births, deaths, domestic and international migration, change) | state, county | PD | annual | API or CSV, no key |
| Census SAIPE + SAHIE | 20–40 (child poverty, median income, uninsured by age, sex, income) | state, county, school district (SAIPE) | PD | annual | API |
| Census County Business Patterns + Nonemployer | 100–200 (establishments, jobs, payroll per NAICS sector, per capita) | state, county, ZIP | PD | annual | API, key |
| Census Planning Database | 300+ tract and block-group fields, incl. the Low Response Score | tract, block group | PD | annual | one CSV |
| LEHD LODES / QWI | 50–100 (jobs by sector, wage band, age; QWI hires and turnover) | block → county | PD | annual | bulk CSV, no key |
| BLS LAUS + QCEW | 30–80 (monthly unemployment; jobs and wages by sector) | state, county | PD | monthly / quarterly | bulk files, no key (API v2 key optional) |
| BEA regional (CAINC, CAGDP) | 40–80 (personal income parts, GDP by industry, transfer receipts) | state, county | PD | annual | API, free UserID |
| IRS SOI county income + migration | 30–60 (AGI, EITC share, in/out migration) | state, county, ZIP | PD | annual | CSV, no key |
| HRSA Area Health Resources File | 300–600 of its 6,000+ county variables (doctors, hospitals, beds, Medicare, deaths) | state, county | HRSA lists usage limits "None"; check AMA-derived fields | annual | CSV, no key |
| CDC PLACES | 40 tract + 2 county (+ place, ZCTA) | county, tract, place, ZCTA | PD | annual | Socrata, no key |
| CDC Environmental Public Health Tracking | 100–200 (heat deaths, asthma ED visits, drinking water, radon) | state, county (some tract) | PD | varies | Tracking API, no key |
| CDC/ATSDR SVI + EJI | 20–40 more themes and inputs | county, tract | PD | every 2 yrs | CSV |
| CMS Medicare geographic variation | 50–100 (spending, use, chronic conditions) | state, county | PD | annual | data.cms.gov, no key |
| County Health Rankings | 80–100 | county | **non-commercial only**, citation required | annual | CSV |
| USDA ERS Food Environment Atlas + Rural Atlas + codes | 250–350 | county | PD | irregular | CSV/XLS |
| USDA NASS Census of Agriculture | 100–300 (farms, acres, crops, farmer age) | state, county | PD | every 5 yrs (2022, next 2027) | Quick Stats API, key |
| EPA (AirData AQI days, TRI, SDWIS violations, ECHO, Superfund) | 60–120 | county; points | PD | annual | bulk files, no key |
| EPA EnviroAtlas | 100+ | block group, HUC-12 | PD | irregular | ArcGIS services |
| HUD CHAS, FMR, LIHTC, subsidized households, AFFH | 100–200 (CHAS alone: housing problems × income band × tenure) | county, tract (CHAS, subsidized) | PD | annual | bulk CSV; HUD User token for FMR API |
| DOT/BTS (NTAD layers, LATCH, NTD, HPMS, NBI, FARS) | 40–80 choropleths + 30+ feature layers | tract (LATCH), county, features | PD | annual | bulk, ArcGIS, no key |
| FEMA (OpenFEMA: declarations, NFIP policies and claims, IA, HMA) | 30–60 | county, tract (NFIP) | PD | daily–annual | OpenFEMA API, no key |
| NCES (CCD, EDGE school-district ACS, F-33 finance) | 50–150 | school district (new level), points | PD | annual | bulk |
| FCC Broadband Data Collection | 20–40 | county, tract, block | PD for aggregates | twice a year | bulk, free login |
| USGS (NLCD land cover by area, water use) | 20–40 | county, tract (zonal stats) | PD | 2–5 yrs | raster bulk |
| NOAA (climdiv more elements, normals, storm events) | 30–60 | county | PD | monthly | bulk, no key |
| State open-data portals (Socrata Discovery API, ArcGIS Hub) | deep, not wide: tens per state | local | **varies per portal** | varies | Socrata Discovery API works with no key (10,000+ "county" hits) |

Notes on access:

- **data.gov:** on 2026-10-27 `catalog.data.gov/api/3/action/package_search` returns 404 (the
  site is a new app; its pages link ArcGIS Hub downloads), and GSA's documented replacement
  `api.gsa.gov/technology/datagov/v3/` (api.data.gov key, `DEMO_KEY` for tests) answered "no
  healthy upstream". Treat a data.gov sweep as a discovery feed for the scout, not an ingest path.
  Robbie's note ("data.gov sweep. mapwich should aim to host an overwhelming amount of data") is
  better served by the source APIs above, which are where data.gov's federal records point anyway.
- **Socrata Discovery** (`api.us.socrata.com/api/catalog/v1`, no key) searches every Socrata
  portal at once (CDC, many states and cities). Good for a Minnesota-deep pass next to the MN
  Geospatial Commons catalog that `ingest mn-catalog` already lists (767 items with licence classes).
- **Census API key** is already in `.env.local`. New free keys a Library phase would add: BEA
  UserID, USDA NASS, HUD User token, api.data.gov. Each is a name in `docs/handbook.md` §1.

### Ideas from this section

**1a. ACS Data Profiles as the first Library batch (~350–400 maps).** A visitor sees a much longer
"Library" shelf under each topic: shares of grandparents raising grandchildren, households with a
computer, workers in each industry, homes heated by each fuel. Robbie gets nearly every common ACS
question answered on the map he already uses, at tract level. Build: one generic `acs_profile`
measure kind plus an automatic shaper (§2): **M (~275k)**. Running cost: R2 storage +~1.5 GB
(gzipped), still near free (§2 table). Fork candidate: no (commodity data; everybody has it).
Builds on `acs.ts` and the existing MOE handling.

**1b. PLACES at tract level (40 maps) + the two missing county measures.** Visitors zoom to their
neighborhood and see modelled diabetes, loneliness, uninsured adults. Robbie: tract health was
already on the wave-3 list (#133). Build: **S (~100k)**, a tract path in `places.ts` writing static
tract files. Cost: ~0. Fork: no. Builds on `places.ts`, D-113 tract files.

**1c. Area Health Resources File (300–600 county maps).** Doctors, dentists, hospital beds,
nursing homes, Medicare enrollment per resident. Strong planner value (health access next to
transportation). Build: **M**, one `ahrf` kind reading the county CSV and its technical doc for
titles and units; licence check on AMA-derived fields first. Cost ~0. Fork: possibly, if the
physician-supply fields are licensed separately; flag it.

**1d. Economy series: CBP + LAUS + QCEW + BEA + IRS SOI (~250–450 maps).** Jobs by industry per
county, monthly unemployment, county GDP, migration in and out. These change every year or month,
which is what makes "what changed" findings (§4) worth reading. Build: **L (~500k)** for four new
kinds. Cost ~0. Fork candidate: **yes** (a "county economic dashboard" for site selectors and
economic developers is a paid product category; all inputs are PD, so a Fork could use them).

**1e. USDA county atlases + Census of Agriculture (~350–600 maps).** Rural depth, which the site
lacks. Build: **M**. Cost ~0. Fork: no.

**1f. A Minnesota-deep shelf from state portals.** Uses the MN Commons catalog Mapwich already
has plus Socrata Discovery; licence gate per item. Serves Robbie's weekly use most directly (his
region). Build: **M** for the generic "public-domain ArcGIS/Socrata layer" path. Cost: depends on
feature-layer tile sizes; most are small. Fork: no.

## 2. How the Library tier could work on today's foundation

## 3. Finding things among thousands of maps

## 4. "Insights into all of it"

## 5. Risks

## 6. Phased path and top 10
