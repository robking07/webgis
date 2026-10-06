> **History.** This is the original prototype build spec (tag `v0.1-prototype`), kept as a record.
> The roadmap (`docs/roadmap.md`) and the handbook (`docs/handbook.md`) now govern; the part-by-part
> status of the prototype is in `docs/prototype-audit.md`.

# Data Viewer Site — Build Spec (Phase 1)

Self-contained handoff for Claude Code (or any agent). Read all of it before writing code.

> Assumptions verified 2026-09-30. Findings are logged as decisions: D-01 to D-99 in `docs/DECISIONS.md`,
> later ones one file each in `docs/decisions/` (`docs/branching.md`). Inline
> notes marked **[verified]** were added during that review.

## 1. What this is

A public, map-first data viewer in the spirit of Data USA, IPUMS, and data.census.gov, with a modern AI-era feel. Focus: transportation and planning, always including Census data. Differentiator: a **"Weird Insights"** feature that pairs two unrelated datasets and surfaces surprising correlations (joke example: "St. Louis has the drunkest dads").

Owner: Robbie (transportation planner / GIS lead). He directs which datasets go in. You source and build. Work in **prototype mode** until something real is on screen: ask one non-blocking question per step (see `CLAUDE.md`), keep building on stated defaults, then hold a review session. After the review, switch to deliberate, question-and-wait refinement.

## 2. Phases

| Phase | Goal | Data |
|---|---|---|
| 1 (this spec) | Beautiful, working boilerplate viewer deployed publicly | Free federal data only |
| 2 | Higher-quality data | Paid APIs (budget approved, sources TBD) |
| 3 | Marketing / launch | Out of scope here |

## 3. Stack (decided)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Map:** MapLibre GL JS by default (no token, no usage fees). Keep the map layer behind a thin wrapper so Mapbox GL JS can be swapped in later.
- **Data/API:** Supabase (Postgres + PostGIS). Pre-computed vector tiles (PMTiles or MVT) for heavy geometry; Postgres for attributes and the insights engine.
- **Hosting:** Vercel (frontend) + Supabase (database). Cheap to start, clean upgrade path. Self-hosting on the home NAS is *not* the target.
  - **[verified]** The spec doesn't say where the PMTiles are hosted; this is an open decision (see DECISIONS D-01). Supabase free projects pause after 7 idle days (D-02).
- **AI layer:** Anthropic API for natural-language dataset search and generating plain-English descriptions of insights. **[verified]** Needs a paid key. Generate the captions ahead of time to keep the cost near zero.

## 4. Phase 1 data (free, federal)

Build a **dataset registry** (one JSON/YAML file per dataset: id, title, source URL, geography level, vintage, fields, units, license, update cadence, default color ramp). Adding a dataset must require *only* a registry entry plus an ingestion script — no UI code.

Priority sources:
1. Census TIGER/Line (boundaries) + ACS 5-year API (demographics, commuting, vehicles, income, housing)
2. Census LEHD/LODES (jobs/commutes)
3. FHWA: National Highway Planning Network, National Bridge Inventory — **[verified]** NHPN's latest version is v14.05 (about 2014). Prefer current BTS NTAD layers at geodata.bts.gov (D-03).
4. National Transit Database (NTD) + transit stop/route data where available
5. HUD housing data, EPA (eGRID, EJScreen if available), NOAA climate normals, BLS/BEA/FRED economic series — **[verified]** EPA took EJScreen offline in Feb 2025; it's only available from archives (D-04).
6. USGS National Map (elevation, hydrography) as base-context layers

Robbie will add or reorder sources. Do not hard-code assumptions about which datasets exist.

## 5. Cartographic design system (non-negotiable)

Bad design is what makes data maps look amateur. Build this **before** adding many datasets:

- Central `design-tokens` module: color ramps (sequential, diverging, categorical), classification methods (quantile, equal interval, Jenks, manual), legend rules, label rules, line/point sizing by zoom.
- Ramps must be **colorblind-safe and contrast-checked**; verify programmatically and fail the build on violations.
- Every layer gets its symbology from its registry entry plus the tokens. No per-layer ad hoc styling.
- One legend component, one tooltip/popup component, one loading/empty/error state, all reusable.
- Light and dark map themes from the same tokens.
- Document the system in `docs/design-system.md` with rendered examples.

## 6. Features for Phase 1

1. Full-screen map with dataset browser (search + category filters)
2. Choropleth rendering at multiple geography levels (state, county, tract) with zoom-dependent switching
3. Click/hover inspection with consistent popups
4. Side-by-side/bivariate view of two datasets
5. **Weird Insights v0:** precompute correlations across dataset pairs at county level; surface top results with plain-English captions (AI-generated), a map, and a scatter plot. Show sample size and a caveat that correlation is not causation.
6. Shareable URLs (state encoded in the URL)
7. Accessible: keyboard navigation, ARIA labels, reduced-motion respect

## 7. Skills to install first

Verify each exists and is current before relying on it; names and install commands change.

**[verified 2026-09-30]**

- Mapbox Agent Skills: `npx skills add mapbox/mapbox-agent-skills` (https://github.com/mapbox/mapbox-agent-skills)
- MapLibre agent skills: `npx skills add maplibre/maplibre-agent-skills -a claude-code` (https://github.com/maplibre/maplibre-agent-skills)
- PostGIS spatial-analysis skill: **no official one found**. Write a project-local `.claude/skills/postgis-analysis`.
- Supabase: `npx skills add supabase/agent-skills`
- Vercel: `npx skills add vercel-labs/agent-skills`

**If no suitable web-GIS skill covers a recurring task** (registry-driven ingestion, tile generation, symbology from tokens), write a project-local skill in `.claude/skills/` as part of the work. Robbie explicitly wants this.

## 8. Repo layout (create this)

```
/apps/web            Next.js app
/packages/design     tokens, ramps, legend/popup components
/data/registry       dataset registry entries
/data/ingest         ingestion scripts (one per source)
/docs                design-system.md, data-sources.md, DECISIONS.md (frozen), decisions/, branching.md
/.claude/skills      project-local skills
CLAUDE.md            short pointer to this spec + conventions
```

## 9. Commands to start

**[verified]** Before running these:
- Replace Debian's npm 9.2 with a current Node/npm (nvm).
- Install `tippecanoe` and GDAL (`ogr2ogr`).
- Docker isn't available in WSL yet: enable Docker Desktop's WSL integration, or use a hosted Supabase project.
- The repo has moved to `~/webgis` inside WSL (D-05).

```bash
npx create-next-app@latest apps/web --typescript --tailwind --app
cd apps/web && npm i maplibre-gl pmtiles @supabase/supabase-js
npx shadcn@latest init
```

```bash
# Supabase local dev (requires Docker)
npx supabase init
npx supabase start
```

Get a free Census API key at https://api.census.gov/data/key_signup.html and store it in `.env.local` as `CENSUS_API_KEY`. Never commit it.

## 10. Failure conditions (stop and log, don't improvise)

Stop and log the issue as a decision (`docs/decisions/`, ID = PR number + 100; `docs/branching.md`) rather than guessing if:

- A data source requires a paid key, login, or has unclear license terms
- A ramp fails the colorblind/contrast check and no safe alternative exists
- Tile or database size would exceed free-tier limits (Supabase free: 500 MB DB)
- A correlation result looks too good (very high r with tiny n, or shared denominators). Flag as likely spurious, never publish it as an insight
- Anything would require touching Robbie's home network, NAS, or work (Metropolitan Council) systems or data. This project is fully separate from both
- A skill or install command from section 7 does not exist or has changed

## 11. Acceptance criteria for the review session

- [ ] Deployed on a public Vercel URL with Supabase backing
- [ ] At least 8 datasets live, added purely via registry entries
- [ ] Design system doc exists and all ramps pass the accessibility check
- [ ] Bivariate view works
- [ ] Weird Insights v0 shows at least 10 vetted, captioned insights
- [ ] The decision log (`docs/DECISIONS.md` + `docs/decisions/`) lists every open question and every stop-condition hit

## 12. Open decisions for Robbie (do not decide unilaterally)

1. MapLibre vs. Mapbox as the long-term map library
2. Project name and domain
3. Which Phase 2 paid APIs to prioritize
4. How edgy/humorous the Weird Insights tone should be for a public audience
