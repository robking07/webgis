# Next ascent research: what the foundation can already do (R1)

Status: complete (2026-10-27).
Next: nothing; the lead harvests it.

Research notes for the lead. Not for merge. Sizes: S ≈ 100k tokens, M ≈ 275k, L ≈ 500k, XL = several L.
Read on 2026-10-27 at `origin/main` 5bd1f06. Every claim below points at a file or decision so it can be checked.

## 1. Capability inventory

The web app is small for what it does: about 8,800 lines across `apps/web/src` (largest: `MapView.tsx`
679, `Viewer.tsx` 506, `ComparePlaces.tsx` 405). Everything a visitor sees reads static files on R2;
the database is only the ingest's working store (D-198, D-210). Running cost today is roughly free
tiers (R2 ≈ 4.2 GB of the 10 GB free tier, D-210; Supabase ≈ 115–320 MB of 500 MB, D-113).

| Building block | What it does today (one line) | Its limits |
|---|---|---|
| **Registry** (`data/registry/schema.ts`, `datasets/*.yaml`, zod) | One YAML file per map: title, plain description, category/subcategory, source, license, unit, levels, measure recipe, timeline, facets, glossary terms, "learn more" links. 138 maps from 17 source kinds. | Units (18) and ramps (9) are fixed lists; a new unit means a design change. No field for "tier" (Featured vs Library), "added automatically", owner, last checked, or quality score. Six categories, hand-ordered (`categories.ts`). |
| **Ingest recipes** (`data/ingest/src/`, one file per source kind) | Generic recipes: `acs5` (any ACS table by variable ids, state→block group), `places` (any CDC PLACES measure), `climdiv`, `lodes`, `features` (any FeatureServer/zip → PMTiles via GDAL + tippecanoe), `fema_nri`, `svi`, `lead`, etc. "Registry-only batches: 52 maps for ~115k tokens inline" (progress Lessons). | Runs only on Robbie's machine (GDAL, tippecanoe, the full `data/tiles` copy). No scheduled refresh: no GitHub Action, no cron besides the Supabase keep-alive. `places` is county only, though CDC publishes tracts and cities. Each new kind edits `schema.ts`, `run.ts`, `format.ts` and conflicts with every other data PR (Lessons). |
| **Static data on R2** (D-198, D-210, D-124, D-257) | Values per dataset/level/period, margins, counts behind rates, `us.json`, per-state click details, per-county tract shards, search index, tract geography. One-hour cache, refresh = upload, no deploy. | Per-state `details/` and per-county `values/tracts/` files hold **every** dataset, so they grow with the catalog and one bad partial upload erases others (the data-tiles incident, #143 guard). |
| **Boundary + feature tiles** (PMTiles on R2, `build-tiles` skill) | State, county, tract, block group, block; feature layers (AADT, CEJST, food access tracts). Range requests, no tile server. | Only five Census levels (`GeoLevel` enum). No place/city, metro (CBSA), ZCTA, urban area, school district, congressional district, MPO as a map level. |
| **Map page** (`Viewer.tsx`, `MapView.tsx`) | Choropleth by level that switches with zoom (D-133), click to drill down (D-329), hover popups (D-359), filters/facets, year slider, two-map compare mode (D-323), share links that hold the exact view (D-266), search for states, counties, Gazetteer cities and 411 MPOs (D-378). | Cities and MPOs are search targets with outlines only: no values, no totals (#332, #292). One dataset at a time (or a pair). |
| **Change over time** (D-252, D-267, `lib/change.ts`) | From → To map for any dataset with a timeline (63 of 138), in points/percent/units, "no clear change" inside the margin of error. Computed in the browser from two existing files. | Earlier-year margins are estimated, and counties and states are never tested (#188, files already exist). ACS stops are 5 years apart. |
| **Compare places** (D-258, D-330, `lib/compare.ts`) | `/compare/A/B`: two states, counties or tracts side by side, a map per place, counts and shares, parts bars (race, commute mode), a test of whether the difference is real. | Same level only; no city, metro or MPO; two places only. |
| **Place profiles** (`/place/[geoid]`, `PlaceProfile.tsx`) | Every dataset for one state, county or tract with margins, rank, state and U.S. benchmarks (D-395), print/PDF and CSV. | Tracts aren't in search, so a tract page has no "Compare with…". No city/metro/MPO profile. U.S. figure missing for jobs, 2020 Census, traffic deaths (#296). |
| **Reliability** (D-222, D-364) | ACS coefficient-of-variation grades, hatching toggle, notes in details, zero-with-big-margin handling. | ACS only (by design); PLACES intervals aren't graded. |
| **Benchmarks** (D-395, `lib/benchmarks.ts`) | "Minnesota 9.6% · U.S. 12.4%" under each value. | U.S. value only where `us.json` exists. |
| **Counts and relations** (D-257, `relations.yaml`) | Numerator/denominator counts with margins for ~50 maps, parts-of-a-whole sets, 51 hand-picked "related map" links. | Hand-kept file; every new map needs an entry or validation fails (good for Featured, a tax on Library). |
| **CSV + print** (`lib/csv.ts`) | Any dataset at state/county/tract/block group, and any place's full profile, built in the browser. | No multi-place or multi-dataset export (e.g. "every county in my MPO, these 10 maps"). |
| **Combinations** (D-116, D-381, D-447, `insights.ts`, `combinations.ts`) | Every county pair of maps screened (n, Spearman, within-state ρ, shared-variable and "too good" flags); 3–5-map sets by holdout + FDR. Every pass is published automatically with a scatter and plain caption. | `insights.json` is 3.7 MB for ~9.5k pairs and grows with the square of the catalog (see §4). County level only. |
| **Specials** (D-115, D-122, `content/specials/*.md`) | Markdown pieces with a main map, inline focus maps, charts/tables, a numbers script checked by `check:special`; four live. | Each needs Robbie's voice; agent drafts cost an editor run. |
| **"Why this matters"** (D-279, `content/context/*.yaml`) | Sourced context panel; ships only when approved. Two maps have it. | Content-bound; Robbie approves each. |
| **Link previews** (`/og/*`, D-165) | Share cards for home, places, datasets, Specials. | Built at build time per dataset and per Combination (see §4). |
| **Data directory** (`/data`, `/data/[id]`) | Every dataset, searchable and filterable, with its source, license, levels and its Combinations. | Statically generated per dataset at build. |
| **MN Geospatial Commons catalog** (`ingest mn-catalog`, `mn-commons-catalog.json`) | 767 Minnesota feature services listed with publisher and a license class: 110 public domain, 120 license agreement, 500 custom terms, 17 none stated. | Ingests nothing; each needs a license call (D-16). A ready seed for Library maps in Robbie's home state. |
| **Design tokens** (`packages/design`) | Every color, ramp, class break (D-429), number format, zoom band, contrast gate (`check:design`). | The single choke point that keeps Featured maps coherent; Library maps would need a sensible automatic default ramp/break rule. |
| **Guardrails and process** (D-147, D-451, CI, `brief.mjs`, `merge-pr.sh`) | Hooks block bad merges and secret reads; CI build, lint, click-through, Lighthouse; the session brief. | e2e only runs in CI (no Chromium in the agent sandbox); Robbie's machine is the only data runner. |

## 2. Cheap unlocks (ranked by value to Robbie's weekly use ÷ cost)

"Cheap" = mostly wiring blocks that already exist. Value is judged against Robbie's week as a
transportation planner and GIS lead: "my area → my numbers → my staff report" (the review lead's
framing on #291/#292), plus showing the site off. Running cost is $0/month for all of these unless
noted. A licensing note that matters for every Fork flag below: 130 of 138 maps are U.S.
government public domain; only FEMA NRI (10 maps, "FEMA may ask users to stop") and three EPA
maps ("free non-commercial and educational use") carry conditions, so a paid Fork could reuse
almost all of today's data (check those 13 first).

| # | Unlock | Value to weekly use | Size (tokens) | Builds on |
|---|---|---|---|---|
| 1 | My area home | High | S (~70k) | URL state, search, MPO outlines |
| 2 | Region data pack (one CSV for a whole area) | High | S (~90k) | details files, tract shards, `csv.ts` |
| 3 | Address lookup → my tract | High | S–M (~150k) | search overlay, tract tiles, place pages |
| 4 | New-release watcher | Medium-high, needs no Robbie | S (~100k) | registry vintages, GitHub issues |
| 5 | Similar places (#291) | High | S–M (~150k) | county value files |
| 6 | Totals for an MPO or chosen counties (#292) | High | M (~275k) | counts files (D-257), MPO shapes |
| 7 | Peer table: my county against 3–10 others | High | M (~200k) | compare, benchmarks, #5 |
| 8 | "What changed" column on place pages | High | M (~250k) | timeline files, `change.ts` |
| 9 | CDC PLACES health maps at tract and city level | Medium-high | S–M (~150k) | `places` recipe, tract shards |
| 10 | Embeddable map for slides and web pages | Medium | S (~80k) | `SpecialMap`, share URL |
| 11 | Small trust fixes bundle (#343, #296, #187) | Medium | S (~100k) | existing code |
| 12 | Dataset key facts (#244, first half) | Medium | S–M (~120k) | `us.json`, state/county values |

**1. My area home.** *Visitor sees:* a "Set as my area" choice on a state, county or MPO; from then
on `/map` opens framed on it, with his pinned maps one tap away and the area's outline drawn.
*Why weekly:* Robbie opens Mapwich for the Twin Cities most weeks; today every visit starts at the
national view. *Build:* browser storage (already used for the theme, `lib/theme.ts`) plus the
existing URL state and MPO outline. S ≈ 70k. *Running:* $0. *Fork:* no.

**2. Region data pack.** *Visitor sees:* on a state or county page, "Download every map for every
county in Minnesota" (or every tract in Hennepin), one tidy CSV with margins and source notes.
*Why weekly:* this is the staff-report step; today it means one CSV per dataset. *Build:* the
per-state `details/<fips>.json` already holds every dataset for the state and its counties, and
`values/tracts/<county>.json` every tract dataset for a county, so this is a browser-side join
and `csv.ts` work. S ≈ 90k. *Fork:* weak (consultants buy this from PolicyMap; a richer "report
pack" is a Fork idea, see #7 in §5). *Limit:* MPO packs need #6's crosswalk first.

**3. Address lookup → my tract.** *Visitor sees:* type an address in search, the map flies there
and selects the tract, with "Open this tract's profile". *Why weekly:* planners get "what's it like
around 123 Main St" questions; the public's first question is "my neighborhood". Tracts aren't in
search today (`PlaceProfile.tsx` shortcut comment). *Build:* one geocoder call (Census Bureau
geocoder through a tiny Vercel function, or a free OSM geocoder within its usage policy), then a
point-in-tract lookup against tiles already loaded. S–M ≈ 150k. *Running:* $0 at Mapwich traffic.
*Fork:* no. *Note:* the address must not be logged or put in share links (privacy).

**4. New-release watcher.** *Visitor sees:* nothing directly; datasets stay current, and the data
page can say "checked 2026-11-02". *Why weekly:* keeps Robbie out of the refresh loop (2–4 h/week
rule) and is the first brick of Library maps. *Build:* a weekly GitHub Action (free on a public
repo) reads each source's "latest vintage" (Census API vintages, Socrata `rowsUpdatedAt`, OpenFEMA
`lastDataSetRefresh`, NOAA file dates) and opens or updates one issue listing stale maps. No
secrets, no writes to R2. S ≈ 100k. *Fork:* no. This overlaps the data-scout's "release watch";
the Action is the script version of it (handbook rule: no agent when a script will do).

**5. Similar places (#291, Robbie: build).** *Visitor sees:* "Counties most like Hennepin: …" on a
place page, each a link to Compare, with one line on what "like" means. *Build:* an offline step
over county value files already on R2 → one small JSON. S–M ≈ 150k. *Fork:* possible (peer-region
selection is a paid consulting task), but the free version is the hook.

**6. Totals for an MPO or chosen counties (#292).** *Visitor sees:* focus Met Council → "3.2 million
people, 11.4% in poverty ±0.3" with the Census way of combining margins; medians say why they
can't be added. *Build:* the counts and their margins already exist per county and tract
(`values/counts/…`, D-257); missing is an MPO → county/tract crosswalk (one ingest step from the
MPO shapes already in `public/mpo/`) and the panel. M ≈ 275k. Unlocks "custom region" (pick
counties) for little more. *Fork:* no.

**7. Peer table.** *Visitor sees:* "Compare with…" accepts several places; a table, my area first,
peers below, benchmarks at the bottom, downloadable. *Why weekly:* grant applications and long-range
plans need peers, not one pair. *Build:* `/compare/A/B` is two-place only; the row logic and
benchmarks exist. M ≈ 200k; best after #5 so peers can be suggested. *Fork:* possible.

**8. "What changed" on place pages.** *Visitor sees:* a "since 2019" column on every place row that
has a timeline (63 maps), grey when inside the margin of error. *Build:* the per-period value files
exist; the cheap path is for `ingest details` to also write the earliest comparable period into
`details/` and the tract shards, then reuse `change.ts`. Needs Robbie's machine for one rerun.
M ≈ 250k. Pairs naturally with #188 (real margins).

**9. CDC PLACES at tract and city level.** *Visitor sees:* the 38 health maps keep coloring when
zoomed into tracts; city values once #332 lands. *Build:* `places.ts` is county-only by choice; CDC
publishes the same measures for tracts and places on data.cdc.gov (public domain). Ingest + level
lists only, no UI code. S–M ≈ 150k. *Cost:* tract shards grow ~1 MB per county file at most;
R2 stays inside the free tier. *Check first:* which tract vintage (2010 vs 2020) the current PLACES
release uses.

**10. Embeddable map.** *Visitor sees:* "Embed" in the share menu gives an iframe snippet of the
exact view, chrome-free. *Why weekly:* Robbie can drop a live map in a slide deck, a staff-report
web page or his portfolio. *Build:* `SpecialMap` already renders a bare map from a dataset +
`at`; an `/embed` route wraps it. S ≈ 80k. *Running:* traffic from embeds hits R2 (free egress).

**11. Small trust fixes.** #343 (hover vs details numbers), #296 (U.S. figures; waits on Robbie's
counts upload), #187 (screen-reader name, endless spinner, false "tiles missing" banner). Together
S ≈ 100k. Not glamorous; they are the things a hiring manager or colleague would notice.

**12. Dataset key facts (#244, first half).** National value, top and bottom 3 states, at the top of
`/data/[id]`. Needs a registry field for which direction is "better", and that is a wording
judgment on sensitive topics (smoking yes; race shares never), so default to "highest / lowest"
and flag. S–M ≈ 120k.

Left out on purpose: AI features (another researcher's topic), new data sources (the data-scale
researcher's), and anything that adds a server.

## 3. Parked issues: still fit? how big?

Checked against the 2026-10-27 decisions (planners first and Robbie's weekly use wins; Featured +
Library tiers; US only, deeper; ≤ $50/month; Robbie's 2–4 h/week; disclosures dropped).

| Issue | Fits? | Size | One line |
|---|---|---|---|
| #332 Cities and metros (2.1) | **Yes, core.** "Deeper: cities, metros" is the decision's own wording. | L (~400k core) | The biggest foundation change on the list: a new place type (§4, limit 1). Do it as the general "new place types" fix, not a one-off. |
| #292 Totals for an MPO or county area | **Yes, core.** | M | Counts exist (D-257); needs an MPO crosswalk. Unlock #6. |
| #291 Similar places | **Yes**, Robbie said build. | S–M | Offline step + a list on place pages. Unlock #5. |
| #296 U.S. figures for jobs, 2020 Census, traffic deaths | Yes | S (~40k) | Blocked on Robbie running `ingest counts` + `publish-counts`. Better: make that run need no Robbie (§4, limit 3). |
| #188 Real margins on change maps | Yes (correctness) | M | Same block as #296: waits on the counts upload. Pairs with unlock #8. |
| #343 Hover vs details numbers | Yes | S | A trust bug; bundle with #187. |
| #187 Map audit fixes (with 1.7 polish) | Yes | S (fixes) / M (with polish) | Accessibility and error states; matters for "portfolio-ready". |
| #280 3–5-dataset Combinations | **Yes, and half done.** | S–M (UI only) | The analysis shipped (D-381): `apps/web/src/generated/combinations.json` holds **72 confirmed sets**, but nothing in `apps/web` reads it. Showing them is UI-only work. Cheapest "insight" win on the board. |
| #207 Visitor suggestions | Partly. The disclosures page it was to replace is dropped; the suggestion box itself still fits "public second". | S–M | Simplest version: a "Suggest a fix" link that opens a prefilled GitHub issue form (no server, no spam handling, no privacy store). Robbie decides where suggestions land. |
| #244 Table into About + key facts | Yes, reshaped | S–M | Key facts on `/data/[id]` is unlock #12; the "data browser" half becomes the Library browse page (§4, limit 2). |
| #115 "Why this matters" | Yes, but it costs Robbie time per map (he approves each). | M build is done (D-279, two maps live); content is S per batch | Keep for Featured maps only. Each batch needs Robbie's review, so it competes with Specials for his hours. |
| #205 Drive times to ER, pharmacy, supermarket | Yes (deeper, planner-native, rare for free). | M–L | Offline routing over OSM on Robbie's machine or a free CI runner; output is ordinary tract maps. Heavy compute, zero running cost. |
| #176 Transit (NTD, routes, GTFS) | Yes for a transportation planner; the review lead's split stands. | PR1 S, PR2a M (new place type: urban areas), PR2b S, PR3 M | PR2a is another instance of the "new place types" limit; do it after #332's general fix and it gets cheaper. |
| #118 How datasets relate (scope) | Mostly done by D-257 (`relations.yaml`: groups, counts, parts, 51 links). | S (close or re-scope) | What is left is a phone comparison layout; fold into #7 peer table or close. |
| #245 Tester onboarding + walkthroughs | Weak fit now. The tester trial (D-291) exists; guided walkthroughs serve the public, not Robbie's week. | M | Park longer; revisit before any public push. |
| #44 Branch protection | Yes (housekeeping); the repo is already public. | S (~20k, settings) | Free on a public repo; turn it on. |
| #169 FEMA disaster declarations | Yes; built (PR #235) and waiting. | S to land | Pairs with NRI maps; good Special material. |
| #172 HUD subsidized households | Hold stands (no stated license, bot wall). | S once cleared | Robbie's call on the license question; not urgent. |
| #133 Data backlog + data.gov sweep | Yes; becomes the Library pipeline's input list. | XL as a whole | Reframe: Featured additions stay hand-picked; the sweep feeds Library maps (§4, limit 2). |

## 4. Foundation limits big dreams will hit

Ordered by how soon a 1–2 year vision hits them. "Thousands of maps" means the Library tier
Robbie asked for ("an overwhelming amount of data"); "new place types" means cities, metros,
MPOs, ZIP areas, urban areas, school and congressional districts.

**1. Places are identified by the length of their ID.** `levelOfGeoid` (`lib/place.ts`) reads 2 digits
as a state, 5 as a county, 11 a tract, 12 a block group, 15 a block. Metro areas (CBSA) and ZIP
areas (ZCTA) also have 5-digit codes, and cities and school districts both have 7, so they would be
read as counties or collide with each other. `GeoLevel` is a fixed list of five; "tract" is written
out 58 times across web, design and ingest; drill-down (D-329) assumes every place nests inside
the one above. *Hits:* #332 cities/metros, #176 urban areas, MPO totals, ZIP lookups.
*Fix:* typed place IDs (`cbsa:31080`, `place:2743000`) and a small "place types" table that says,
per type, where its outlines, names, search rows and value files live and whether it nests. Then
each new type is mostly config. L (~500k) for the general fix including cities and metros as the
first two types (vs #332's ~400k for cities and metros alone); afterwards S per type.

**2. Every map is a Featured map.** The registry has no tier, quality or "added automatically" field;
`relations.yaml` fails validation for any map without a hand entry; six hand-ordered categories;
the map menu lists all maps of a category. At 1,000+ maps the menu becomes a wall and the hand
steps become the bottleneck. *Fix:* `tier: featured | library` and `addedBy` in the schema; Library
maps exempt from hand relations, "Why this matters" and Combinations by default; a "Library"
browse page with search and facets (source, topic, level, year) and a clear "added automatically"
label; a "promote" checklist. M (~275k) for the mechanism and browse page; the generators that
fill it are separate (an ACS-table generator is S–M, since the `acs5` recipe takes any variables).

**3. Data only moves when Robbie's machine runs it.** Ingest needs GDAL, tippecanoe and the one
complete `data/tiles` copy (the memory note "data/tiles incomplete" is a trap that once wiped live
tract data). #296 and #188 have waited weeks on one command. With 2–4 hours a week this caps how
much data Mapwich can ever hold. *Fix:* run ingest in GitHub Actions (free on a public repo:
6-hour jobs, ~14 GB disk; GDAL via conda), reading the current files back from R2 before writing,
and uploading only after the never-drop-a-dataset check passes. Needs R2 and database keys as
GitHub secrets, which changes the "secrets only in `.env.local`" rule: **Robbie's call**. L (~450k)
including a dry-run mode and a weekly schedule. *Running:* $0. This is the single biggest enabler
of Library maps, the release watcher (unlock #4) and "no Robbie needed" data work.

**4. Combined files grow with the catalog.** A click on a county loads `details/<state>.json` with
every dataset for that state (Texas: 215 KB gzipped at 58 datasets, D-198; roughly 500 KB now);
a tract click loads `values/tracts/<county>.json` with every tract dataset (Los Angeles: 2.1 MB raw
at 40 datasets, D-113). At 1,000 maps a Texas click would be several MB. The same files are why one
partial upload can erase other datasets. *Fix:* keep these combined files for Featured maps only;
Library values load per dataset when the visitor opens one. M (~200k), and it removes the
erase-on-partial-upload risk for Library data.

**5. The whole registry ships to every visitor.** `generated/registry.json` (276 KB, 33 KB gzipped) is
imported into the map's client code. At 1,000 maps that is ~250 KB gzipped on every map load, at
5,000 over 1 MB. *Fix:* a slim index (id, title, category, levels, unit) in the bundle, the rest
fetched per dataset from R2. S–M (~150k). Do it together with limit 2.

**6. Pairs grow with the square of the catalog.** 138 maps → 8,646 county pairs screened, 1,759
published, `insights.json` 3.7 MB (391 KB gzipped), and the build makes a share card for every
published pair (`/og/special/[id]` `generateStaticParams`). 1,000 maps ≈ 500k pairs, and the
build would try to render tens of thousands of cards. *Fix:* Library maps join Combinations only
when promoted, or only against Featured maps (n × 138, linear); share cards and dataset pages
render on first request and cache (Next's on-demand rendering) instead of all at build. S–M
(~120k). The statistics in D-381 already correct for how many pairs were tried.

**7. The database is a 500 MB working store.** State and county rows run about 0.6 MB per map
(D-113's ~190 bytes a row); it was 305 MB before tracts moved out. A few hundred Library maps
fill it. *Fix (preferred):* ingest writes static files directly and stops writing values to the
database (it is already off the visitor path, D-198, D-210). M (~250k). *Alternative:* Supabase
Pro, $25/month, which fits under the $50 ceiling but spends half of it.

**8. Areas that don't follow county lines.** MPOs, cities, corridors, a "within 1 mile of this
line" study area: today nothing can give them a number. *Already in hand:* the 2020 Census
ingest builds from **blocks** (`census2020.ts`), so block populations exist; that is the standard
way to apportion tract counts to any shape. *Fix:* a block-weighted crosswalk step that, for any
outline, writes which tracts it covers and with what population share; totals (#292), MPO
profiles, custom regions and transit-corridor numbers all reuse it. M (~250k). Estimates for
apportioned areas need a plain "approximate" note.

**9. Hosting terms for a Fork.** Vercel's free Hobby plan is for non-commercial use, which Mapwich
is. A paid Fork would need Vercel Pro (about $20/month) or another host, plus its own R2 bucket.
Not a Mapwich limit; a line item for any Fork estimate.

**10. Specials and "Why this matters" are bound by Robbie's voice.** Both need his review
(memory: Specials format; D-279). At 1–2 Specials a month that is most of his weekly hours.
*Fix:* not a code fix. Make the editor's drafts start from material the site already computes
(the 72 confirmed 3–5-map Combinations, change maps, new releases from the watcher) so his time
goes on voice, not research. S per draft, already budgeted in the editor role.

What does **not** break soon: R2 storage and egress (≈ 5 MB per map with tracts and block groups;
1,000 maps ≈ 5 GB, inside the 10 GB free tier; 5,000 maps ≈ $0.25/month), MapLibre rendering
(one map at a time), and visitor load (static files and a CDN; a 1,000-user test, S5, is still
worth running before any public push).

## 5. Top 10

Ranked by value to Robbie's weekly use ÷ cost, with the enablers placed where the big dreams need
them. Running cost is $0/month for all ten unless noted.

| # | Idea | What a visitor gets | Size | Fork? | Builds on |
|---|---|---|---|---|---|
| 1 | **My area home** | Mapwich opens on his area (Twin Cities / Met Council) with his pinned maps | S ~70k | No | URL state, MPO outlines, browser storage |
| 2 | **Region data pack** | One CSV: every map for every county in a state, or every tract in a county | S ~90k | Weak | `details/`, tract shards, `csv.ts` |
| 3 | **Similar places + peer table** (#291) | "Counties most like Hennepin", then my county against 3–10 peers in one table | S–M ~150k, then M ~200k | Possible | county values, compare, benchmarks |
| 4 | **Show the 72 confirmed 3–5-map Combinations** (#280, UI half) | Sets like "these four maps line up across counties", with the plain reading and "not causation" | S–M ~120k | No | `generated/combinations.json` (already built, unused) |
| 5 | **Address lookup → my tract** | Type an address, land on its tract and profile | S–M ~150k | No | search, tract tiles, place pages |
| 6 | **Numbers for any area: MPOs, chosen counties, corridors** (#292 + block crosswalk) | "Met Council: 3.2M people, 11.4% in poverty ±0.3"; later, draw-your-own area | M ~275k + M ~250k | **Yes**: custom-area reports are what planners and consultants pay PolicyMap/Esri for | counts + margins (D-257), 2020 block populations, MPO shapes |
| 7 | **Data runs without Robbie** (ingest in GitHub Actions + weekly release watcher) | Maps stay current; new releases show up on their own | L ~450k + S ~100k | No | ingest recipes, never-drop guard (#143); **needs Robbie's yes on GitHub secrets** |
| 8 | **Place types done once; cities and metros first** (#332 + typed place IDs) | Search "Minneapolis" or "Minneapolis metro", see its official numbers with ± | L ~500k | No | search, benchmarks, reliability; then urban areas (#176), ZIP areas, districts at S each |
| 9 | **Library maps** (tier field, browse page, per-dataset loading, slim registry, linear Combinations) | Thousands of maps labeled "added automatically", promotable to Featured | L–XL ~650k for the mechanism; generators extra (ACS-table generator S–M) | No | registry, `acs5`/`places`/`features` recipes, MN Commons catalog (110 public-domain layers), #7 |
| 10 | **"What changed" on place pages + real margins** (unlock #8 + #188) | A "since 2019" column on each place row, honest about noise | M ~250k + M ~275k | No | timeline files, `change.ts`, margin files already written |

Honorable mentions: embeddable map (S ~80k, good for Robbie's slides and portfolio), the trust
bundle #343 + #187 + #296 (S ~100k), CDC PLACES health maps at tract and city level (S–M ~150k,
ingest only), dataset key facts (S–M), turn on branch protection (#44, minutes).

**A possible order, for the lead to weigh.** First wave, cheap and weekly: 1, 2, 4 and the trust
bundle (~400k together). Second: 3 and 5. Then the two enablers that every big dream needs, 7
and 8, before 6 and 9. #10 rides along once 7 makes reruns free. Rough total for all ten:
~3.5M tokens (two to three phases at today's pace).
