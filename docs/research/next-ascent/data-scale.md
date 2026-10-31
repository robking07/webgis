# Data at scale: Library maps (research notes, R4)

Status: complete (2026-10-27). All six sections written.
Next: nothing; the lead harvests. Open questions are in the PR description.

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

**Bottom line.** Today one hand-written YAML file = one map, and the hand work (title, phrase,
explainer, ramp, coverage note, relations entry) is the bottleneck, not the pipeline. The Library
tier swaps the hand work for a **recipe per source** plus an **automatic shaper** and an
**automatic gate**, writing Library entries the site already knows how to draw. Four things in the
foundation break before 1,000 maps: the database (≈650 maps), the per-county tract bundle and the
per-state click-detail files (≈300–500 maps), the registry bundled into every page (≈1,000), and
the all-pairs Combinations job (≈1,000). None needs new paid services.

### How a Library map gets made (proposed)

1. **Recipe** (one small YAML per source batch, written once by an agent, reviewed like code):
   which tables or measures to take, the denominator rule, the topic each one goes under. Example:
   "every percent variable of DP04, under Housing; skip totals and complements".
2. **Shaper** (a script, no agent at run time):
   - *Title* from the source's own label, made readable by fixed rules
     ("Percent!!HOUSE HEATING FUEL!!Occupied housing units!!Wood" → "Homes heated with wood"),
     with a one-time language-model pass over the whole batch for the labels the rules can't
     clean. The result is cached in the entry, so it runs once per map, not per visit.
   - *Unit* from the variable type (PE → percent, median dollars → dollars, rates → per 100k).
     Library maps use only units `format.ts` already has; anything else is skipped, not invented.
   - *Colors* from `packages/design` tokens by rule: sequential ramp chosen by topic (the same
     ramp the topic's Featured maps use), quantile, 5 classes; diverging only for signed change.
     No new ramps, so the contrast gate (`check:design`) still holds (hard rule: symbology from tokens).
   - *Explainer*: one templated sentence ("Share of {universe} who {label}, {source}, {period}.")
     plus the source's label verbatim and a link to the table's documentation. No generated prose
     about people (see §4, sensitive topics).
   - *Coverage note* written from the gate's own results ("No data for 2 states: …").
3. **Gate** (automatic checks; a map that fails any stays out and the reason is logged):

   | Check | Pass means |
   |---|---|
   | Licence | Source is on an allow-list of licences (PD, CC0, CC BY, non-commercial per D-30), set per source in the recipe, never per map |
   | Coverage | ≥ 90% of counties (or of the level's areas) have a value; otherwise the level is dropped |
   | Variation | Values aren't near-constant (at least 5 distinct quantile classes) |
   | Range | Percent 0–100, counts ≥ 0, no sentinel codes (-666666666 etc.) leaking through |
   | Outliers | Areas beyond a robust z of 6 are listed in the log and checked against the source |
   | Reliability | Median coefficient of variation per level (D-222's rule); a level where most areas are unreliable is dropped (block groups first) |
   | National total | The U.S. figure matches the source's published U.S. value within 1% (ACS gives `us` directly) |
   | Duplicate | Not |r| > 0.98 with a map already live; otherwise it becomes an alias, not a new map |
   | Sensitive topic | Matches the sensitive list (race, citizenship, disability, crime, deaths, religion, sexual orientation…) → published with the source's wording only, kept out of automatic findings, listed for Robbie (§4) |

4. **Label.** Every Library map carries "Added automatically" on its card, legend caption and
   `/data/<id>` page, with a one-line "how this was made" link to the recipe and the gate results.
5. **Promote to Featured.** Same id (so links keep working), entry moves from the Library folder
   to `data/registry/datasets/`, gets the hand work (phrase, explainer, "Why this matters"), and the
   badge drops. A promotion is an S task or less; it's also the natural way Robbie's weekly use
   feeds back ("I keep opening this one").

### What has to change in the foundation

| Piece | Today | Change for Library | Size |
|---|---|---|---|
| Registry schema | 18 measure kinds, every field hand-written | `tier: featured \| library`, `recipe`, `checks` (results), optional `phrase`; generic kinds `acs_profile`, `acs_table`, `socrata_measure`, `csv_column` | S |
| Registry files | `datasets/*.yaml`, one per map | `library/<source>/*.yaml` generated by the shaper (or one JSON per recipe; thousands of YAML files slow `registry:validate` and review) | S |
| `relations.yaml` | validate fails if a map is missing (D-257) | Library maps get relations from the recipe (group = topic; counts from the ACS numerator/denominator), no hand entry | S |
| Ingest working store | Supabase `dataset_values` for state and county (~190 bytes/row, ≈0.6 MB per map; D-113 hit 305 of 500 MB) | Library writes static files directly; a local DuckDB or Parquet file is the working store; Supabase keeps Featured only | M |
| Tract click details | `values/tracts/<county>.json` holds **every** tract dataset (LA County is 4.1 MB raw today for ~72 tract maps) | Featured stay in the bundle; Library tract values load per topic (`values/tracts/<topic>/<county>.json`) only when the visitor opens that topic | M |
| State/county click details | `details/<state>.json` holds every map (Texas 1.4 MB raw for 138) | Same split: Featured bundle + per-topic Library files | S (with the above) |
| Registry in the browser | `generated/registry.json` (276 KB for 138 maps, ~2 KB each) bundled into the map page | Bundle Featured only; Library index (id, title, topic, levels, unit; ~150 bytes each) as one file on R2 read by search; full entry fetched on open | M |
| Dataset pages | `/data/[id]` and `/og/data/[id]` prerendered for every map | Library pages render on first visit and are cached (no build-time list) | S |
| Combinations | all county pairs every run (138 maps → 8,646 pairs, 1,759 published; `insights.json` 3.8 MB in the bundle) | §4: compare each new map against Featured + its own topic, not all pairs; output to R2 | M |
| e2e click-through | walks the menus | Samples Library maps (e.g. 20 random per run) instead of all | S |

### What breaks, by scale

| Scale (total maps) | What breaks first | Fix |
|---|---|---|
| ~300–500 | Tract click details: the per-county bundle grows ~55 KB per tract map in LA County, so ~25 MB per click at 500 maps | per-topic tract files |
| ~650 | Supabase 500 MB (≈0.6 MB per map at state + county, plus geographies and insights) | Library bypasses the database |
| ~1,000 | Registry in the page bundle (~2 MB raw); Combinations (~500k pairs, and the caption step); the map menu (a list of 1,000 is unusable) | Library index on R2; scoped Combinations; Library lives in search and browse, not the menu (§3) |
| ~10,000 | Build of dataset pages (20,000 prerendered pages); first upload (~80k files at 16 at a time ≈ 1–2 h); `registry:validate` and review of thousands of files | pages on demand; recipe-level review; upload only changed files (already does) |

### Monthly running cost at each scale

Assumptions: R2 gzipped size per map ≈ 1 MB tract-only (a Data Profile map) to 3.5 MB with
block groups (`pct_poverty` today: 13 MB raw over all levels and margins); R2 free tier 10 GB,
then $0.015/GB-month, egress free, 1M writes and 10M reads free per month. Today's R2 is about
4.3 GB, most of it boundary and feature PMTiles (block tiles 2.8 GB, AADT 0.5 GB).

| Scale | R2 storage | R2 operations | Vercel | Supabase | One-time language-model use | Monthly total |
|---|---|---|---|---|---|---|
| Today, 138 | ~4.3 GB, free | free | Hobby, free | free (not measured here; D-113 recorded 305 MB before tract values moved out) | — | ~$0 |
| +500 Library (~650) | ~5–6 GB, free | free | free | free (Library bypasses it) | titles for ~500 labels: well under 1M tokens | ~$0 |
| 1,000 | ~6–8 GB, free | free | free with on-demand pages | free | ~1M tokens | ~$0 |
| 10,000 | ~20–40 GB → **$0.15–0.45** | a full refresh is ~80k writes, free | free if pages are on demand; Pro ($20) only if traffic or build limits bite | free | ~10M tokens for titles; per-pair captions must stay templated | **≈ $1, up to ~$21** |

The money question is not hosting; it's agent tokens to build it (§6) and any language-model
captions at scale (§4). Both are priced and wait for Robbie when they exceed the $50/month line.

### Ideas from this section

**2a. The Library pipeline (recipe → shaper → gate → label).** Visitors see thousands of extra
maps, each honestly marked "Added automatically". Robbie gets breadth without paying for hand work
on maps nobody opens; his use tells the lead which to promote. Build: **L (~500k)** for schema,
shaper, gate, labels and the first recipe (ACS profiles). Cost ~$0. Fork candidate: **yes** (an
"auto-shaped public data library" is a product others would pay for; the pipeline is MIT code,
the data PD). Builds on the registry, `acs.ts`, D-222 reliability, D-447's "publish what passes".

**2b. Static-first ingest (Library skips Supabase).** Nothing visible; it removes the 500 MB
ceiling for good. Build: **M**. Cost: avoids Supabase Pro ($25/month). Fork: no.

**2c. Split click details and the tract bundle by topic.** Faster clicks on phones even before
Library grows. Build: **M**. Cost ~$0. Fork: no.

**2d. Promote-to-Featured flow.** A one-click (one-command) promotion and a "most opened Library
maps" list for the lead from page-view analytics (Vercel Web Analytics, if on). Build: **S**. Fork: no.

## 3. Finding things among thousands of maps

**Bottom line.** Keep the map menu for Featured maps only, so the map stays clean (map-first
rule: options appear as the visitor digs in). The Library is reached three ways: **search** (one box
for places and maps), **browse** (a Library page by topic and source), and **from a place**
("everything we know here"). The per-place view is the strongest idea in this report for
Robbie's weekly use, because it answers "what's going on in this county?" across every map at once.

Today: `searchDatasets()` filters the bundled registry in the browser (title, topic, tags, source,
whole words of the description; issue #252); place search loads `geo/search.json` from R2 on first
use. Both patterns scale if the Library index is a separate file on R2.

**3a. One search box for places and maps, Library included.** A visitor types "wood heat" or
"Hennepin rent" and sees Featured maps first, then Library maps with their badge, then places.
"Hennepin rent" opens Hennepin with the rent map on. Index: id, title, topic, source label words,
glossary synonyms; ~150 bytes a map, ~300 KB gzipped at 10,000, loaded on the first keystroke.
Build: **S–M (~150k)**. Cost ~$0. Fork: no. Builds on `searchDatasets`, `search.ts`, glossary.
Meaning-based search ("where do people struggle to pay for heat?") is a later step and overlaps
the visitor-AI research; a static embedding index built offline would keep it free to run.

**3b. Library browse page.** `/data` grows a Library section: topic → source → table, with counts
("Housing · 214 maps added automatically"), a filter for level (tract, county) and for "has
change over time". Each Featured subcategory in the map menu ends with one quiet line, "More in the
Library (37)". Build: **M**. Cost ~$0. Fork: no. Builds on `/data`, `bySubcategory()`.

**3c. Related maps, mostly automatic.** Three sources of "related":
- *Same table* (by construction): every share from one ACS table is a parts-of-a-whole set, so the
  `parts` sets that `relations.yaml` holds by hand for race and commute modes can be generated for
  every Library table (a stacked bar in the details panel for free).
- *Similar pattern*: the 5 maps whose county pattern is most alike (rank correlation, §4), with
  the "by construction" flag the Combinations checks already raise.
- *Hand links* (`relations.yaml` `links`) stay for Featured.
Build: **M**. Cost ~$0. Fork: no. Builds on D-257 relations, `insights.ts`.

**3d. "Everything we know here" for a place.** The place page (and the click details) gets a
"What stands out" list on top: the maps where this county ranks in the top or bottom 5% nationally
or within its state, reliable estimates only, sensitive topics shown with the source's wording and
never in the headline line. Below it, every map grouped by topic, collapsed. Data: one small file
per county with every map's value and percentile (10,000 maps × ~10 bytes ≈ 100 KB raw per county);
tracts per county per topic. Build: **M–L (~350k)**. Cost: +~0.5–1 GB R2 at 10,000 maps, ~$0.
Fork candidate: **yes** (place briefs for consultants and site selectors are a paid niche; PD inputs).
Builds on `PlaceDataList`, `/place/[geoid]`, D-198 details, D-222 reliability.

## 4. "Insights into all of it"

**Bottom line.** "Insights into all of it" at 10,000 maps can't mean every pair (50 million pairs;
at that count thousands pass any threshold by chance). It should mean four honest, cheap,
automatic products: **what stands out in a place**, **rankings that respect margins of error**,
**what changed** (with a real significance test), and **Combinations scoped to Featured maps**.
Every automatic finding is labelled as such, shows its test, and skips sensitive topics unless
Robbie has cleared the wording.

Today: `insights.ts` computes Pearson r and Spearman ρ for every county pair (8,646 pairs at 138
maps), runs the SPEC §10 checks (n ≥ 500, |r| ≤ 0.9, Pearson–Spearman gap, |ρ| ≥ 0.3, within-state
ρ ≥ 0.15, shared variables, shared universe, model inputs), and publishes 1,759 (D-447). Captions
come from Claude at build time when a key is present, else a template.

**4a. What stands out here** (the engine behind 3d). Percentile of every map for every county,
nationally and within the state; flag the top and bottom 5%; drop estimates whose coefficient of
variation is over D-222's limit; show at most 8, spread across topics. Plain template wording:
"Hennepin County: homes heated with electricity, 41% (top 10% of U.S. counties)." Build: included
in 3d. Fork: see 3d.

**4b. Rankings that respect error.** Top and bottom 10 counties per map, computed only among areas
whose estimate is reliable, and grouped into "about the same" when margins overlap (the
`compare.ts` difference test). Small counties stop owning every extreme, the usual flaw of
automatic rankings. Build: **S–M**. Cost ~$0. Fork: no.

**4c. What changed.** For maps with two non-overlapping ACS periods (2015–2019 vs 2020–2024) or
annual series (BLS, BEA, PEP, CBP): biggest significant changes, using the Census Bureau's test
(at 90% confidence: the difference is bigger than √(MOE₁² + MOE₂²)) and dollar adjustment already in `acs.ts`.
Flags comparability breaks (Connecticut's 2022 counties, table changes between years, the
insurance gap). Build: **M**. Cost ~$0. Fork: no. Builds on change maps (1.2), #188 real margins.

**4d. Combinations at scale, scoped.** Each Library map is paired with the ~140 Featured maps
only (10,000 × 140 = 1.4M pairs: minutes in a script), not with every other Library map. Raise
the bar for Library pairs: a false-discovery-rate correction over the batch, one pair per table
family (not 30 near-identical pairs from one ACS table), and the existing checks. Captions stay
templated for Library pairs; Claude-written captions only for pairs Robbie or the lead promotes
(caption cost scales with published pairs). Output moves from the page bundle
(`insights.json`, 3.8 MB today) to R2. Build: **M**. Cost ~$0 with templates. Fork: no.

**4e. A weekly "what's new in the data" digest for Robbie.** After each refresh (BLS monthly
unemployment, PEP, a new ACS year), a short list of the biggest significant changes and new
standouts, written to `drafts/` for him to skim, and the best ones as Special leads. Serves the
North Star tie-break (weekly use) and the Specials pace. Build: **S** (a script plus a scheduled
routine). Running cost: routine tokens per week (~50–100k), no hosting cost. Fork: no.

**Keeping it honest.**
- Label: every automatic finding says "Found automatically", names its test, and says a pattern
  isn't a cause (the same rule Combinations follow today).
- Reliability first: no finding uses an estimate D-222 marks unreliable.
- Multiple testing: the false-discovery correction in 4d; for 4a, percentiles are descriptions,
  not tests, so they say "ranks" and never "significantly".
- By construction: recipe metadata (shared table, shared denominator, model inputs) feeds the
  existing flags automatically, so "% renters vs % owners" never surfaces.
- **Sensitive topics are routed to Robbie** (project rule: he reviews wording about people and
  sensitive topics). A per-topic list (race and ethnicity, citizenship and immigration, disability,
  deaths and overdoses, crime, religion, sexual orientation, enforcement) sets
  `excludeFromInsights` on Library maps by default. The map itself can publish with the source's
  wording; findings about it wait until Robbie clears a wording template for that topic, once.

## 5. Risks

| Risk | What it means | Handling |
|---|---|---|
| **ACS 2021–2025 drops health insurance** | The Census Bureau leaves insurance out of the 2021–2025 5-year tables while it bridges a 2025 question change; it expects to publish it again with 2022–2026, plus four unofficial "demonstration" tables. `pct_uninsured` can't refresh this cycle. | Keep the 2020–2024 map with a note. Library fill-ins: **Census SAHIE** (county uninsured by age, sex, income; annual, PD) and **PLACES `ACCESS2`** (modelled uninsured adults 18–64, county and tract). Neither is the same measure; say so on the map. |
| **New disclosure-avoidance order (Commerce DAO 216-26, June 2026)** | Bans noise infusion, leaving coarsening and suppression. The 2025 ACS 1-year release had no date as of the Aug 4 advisory; over 100 organizations wrote to Commerce on Sept 4. Small-area products (ACS 5-year, CBP, LEHD/QWI, decennial) may be coarsened or suppressed, with full transition by 2029 and a demonstration product in 2027. The 2021–2025 5-year release (usually December) may be late or mixed. | The biggest risk to a Census-heavy Library. Keep the source files of every vintage we ingest (`data/cache`), build the gate to *expect* suppressed cells (coverage check per level), and don't promise block-group or tract depth for future years. A release-watch item for the scout. |
| **Federal data removed or moved** | EPA took EJScreen down in 2025; data.gov's CKAN API now 404s. | Recipe per source with a pinned URL and a checksum; keep raw downloads; note mirrors (Data Rescue Project, DataLumos) with provenance, as the scout does today. |
| **Licences** | Federal data is PD, but County Health Rankings is non-commercial only; AHRF says no usage limits yet may carry AMA-derived physician counts; state and city portals vary item by item (ODbL share-alike, "no redistribution"). | Licence set **per source** in the recipe, with an allow-list; non-commercial sources are fine here (D-30) but marked so a **Fork** knows it can't use them. State portals go through the existing per-item licence classes (`mn-catalog`). |
| **Sensitive data at scale** | ACS race iterations, citizenship, disability, group quarters (prisons, nursing homes), overdose deaths. An automatic title or finding can read badly. | Topic list → source wording only, out of automatic findings until Robbie clears the topic's template (§4). Group-quarters tables likely skipped in the first batches. |
| **Quality** | Small-area estimates are noisy; modelled data (PLACES uses ACS inputs) correlates by construction; tract boundaries changed in 2020; Connecticut counties changed in 2022; ACS variable numbers shift between years (a Data Profile line can move), which breaks timelines silently. | Gate checks (§2), `modelInputs` from the recipe, match variables across years by label not by number, timelines only where the label match holds. |
| **Trust in the Featured maps** | One wrong automatic map can make visitors doubt the hand-checked ones. | Clear "Added automatically" label, a "how this was made" link, and an easy "report a problem" path; Library maps never in the map menu, splash or Specials unless promoted. |
| **Maintenance** | Thousands of maps × annual refreshes. Silent failure means maps vanish. | Refresh = re-run recipes; the gate log lists every map that dropped and why; the brief (`scripts/brief.mjs`) shows the counts. |
| **Agent tokens** | Building is the real cost (≈ 6M tokens for all of §6). | Phase it; every recipe after the first is S-sized. |

## 6. Phased path and top 10

### Phased path

**Phase A — first ~500 Library maps (≈ 1.3–1.5M tokens).** Foundation plus the cheapest batches.
1. Library pipeline: schema `tier`, recipe, shaper, gate, labels, promotion (2a, 2d): **L**.
2. First recipe: ACS Data Profiles, ~350–400 maps (1a): inside the L above, plus **S** for the batch.
3. PLACES at tract level + `ACCESS2`, `FOODSTAMP` at county (1b), and SAHIE (insurance gap): **S + S**.
4. Static-first ingest (2b) and click details split by topic (2c): **M + M**.
5. Search covering the Library (3a): **S–M**.
Gate: Robbie finds and uses a Library map in a real week; R2 under 10 GB; database size unchanged.

**Phase B — to ~1,500 (≈ 2–2.5M tokens).** Depth that planners notice.
AHRF health resources (1c, **M**), USDA atlases + Census of Agriculture (1e, **M**), economy series
(1d, **L**), "What stands out here" place view (3d + 4a, **M–L**), rankings with error (4b, **S–M**),
Library browse page (3b, **M**), related maps (3c, **M**).

**Phase C — thousands (≈ 2.5–3M tokens).** ACS detailed tables and race iterations (sensitive
routing first), CBP by industry, EPA/HUD/FEMA/NCES recipes (each **S** once the pipeline exists),
what-changed findings (4c, **M**), scoped Combinations at scale (4d, **M**), weekly digest (4e,
**S**), Minnesota-deep shelf (1f, **M**), meaning-based search (**M**, shared with the visitor-AI
research). School districts as a new geography level would be its own **M–L** (tiles + names).

Running cost stays near $0/month through Phase B and about $1/month at 10,000 maps (§2 table);
the only priced items are a move to Vercel Pro ($20) if build or traffic limits bite, and any
language-model captions beyond templates.

### Top 10 (ranked by Robbie's weekly use, then value per token)

| # | Idea | What a visitor gets | Size / tokens | Monthly cost | Fork? |
|---|---|---|---|---|---|
| 1 | Library pipeline: recipe → shaper → gate → "Added automatically" label → promotion (2a, 2d) | Thousands of honest, labelled maps; Featured stays hand-made | L ~500k | ~$0 | Yes |
| 2 | ACS Data Profiles batch (1a) | ~350–400 new tract-level maps on every common Census question | S ~100k (after #1) | ~$0 | No |
| 3 | "What stands out here" place view (3d + 4a) | Open a county, see where it's unusual across every map | M–L ~350k | ~$0 | Yes |
| 4 | One search for places and maps, Library included (3a) | Type a topic or "place + topic", land on the map | S–M ~150k | ~$0 | No |
| 5 | PLACES tract level + SAHIE insurance (1b) | Neighborhood health; an uninsured map that keeps refreshing | S ~100k | ~$0 | No |
| 6 | Static-first ingest + topic-split click details (2b, 2c) | Faster clicks; no 500 MB ceiling | M + M ~550k | ~$0 (avoids $25) | No |
| 7 | Economy series: LAUS, QCEW, CBP, BEA, IRS SOI (1d) | Monthly unemployment, jobs by industry, county GDP, migration | L ~500k | ~$0 | Yes |
| 8 | What changed + rankings with error (4b, 4c) | "Biggest real changes" and fair top-10 lists | M + S ~375k | ~$0 | No |
| 9 | AHRF health resources (1c) | Doctors, hospitals, beds per resident by county | M ~275k | ~$0 | Maybe (AMA fields) |
| 10 | Weekly "what's new in the data" digest for Robbie (4e) | Robbie gets story leads every week | S ~100k | routine tokens only | No |

Close runners-up: Library browse page (3b), related maps (3c), USDA rural depth (1e), scoped
Combinations (4d), Minnesota-deep shelf (1f).

### Sources

- Census API catalogs, fetched 2026-10-27: `api.census.gov/data/2024/acs/acs5/groups.json`,
  `.../acs5/variables.json`, `.../acs5/profile/variables.json`, `.../acs5/subject/variables.json`.
- CDC PLACES on data.cdc.gov (Socrata catalog and `swc5-untb`, `cwsq-ngmh`), queried 2026-10-27.
- Health insurance exclusion: [Census, ACS health insurance](https://www.census.gov/data/tables/time-series/demo/health-insurance/acs-hi.html).
- DAO and the 1-year delay: [Census media advisory, Aug 4 2026](https://www.census.gov/newsroom/press-releases/2026/iphi-acs-media-advisory.html),
  [Census director's blog](https://www.census.gov/newsroom/blogs/director/2026/08/understanding-the-new-disclosure-avoidance-policy.html),
  [Carolina Demography](https://carolinademography.cpc.unc.edu/2026/09/02/federal-policy-will-limit-the-public-data-available-to-nc-communities/),
  [Census Project letter](https://thecensusproject.org/2026/09/04/over-100-incredibly-diverse-organizations-write-to-lutnick-critical-of-delay-in-acs-release/).
- data.gov API: [GSA data.gov API docs](https://open.gsa.gov/api/datadotgov/); `catalog.data.gov/api/3` tested 2026-10-27 (404).
- [County Health Rankings terms](https://www.countyhealthrankings.org/terms-use);
  [HRSA AHRF](https://data.hrsa.gov/topics/health-workforce/ahrf).
- Socrata Discovery API (`api.us.socrata.com/api/catalog/v1`), tested 2026-10-27.
- Repo: `data/registry/schema.ts`, `data/ingest/src/insights.ts`, `apps/web/src/lib/registry.ts`,
  D-113, D-124, D-210, D-222, D-257, D-447; sizes measured in `~/webgis/data/tiles` (read only).
