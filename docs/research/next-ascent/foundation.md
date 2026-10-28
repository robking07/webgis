# Next ascent research: what the foundation can already do (R1)

Status: section 1 done.
Next: write section 2 (cheap unlocks).

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

## 3. Parked issues: still fit? how big?

## 4. Foundation limits big dreams will hit

## 5. Top 10
