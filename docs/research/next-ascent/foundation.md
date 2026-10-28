# Next ascent research: what the foundation can already do (R1)

Status: sections 1–2 done.
Next: write section 3 (parked issues).

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

## 4. Foundation limits big dreams will hit

## 5. Top 10
