---
name: add-dataset
description: Add a dataset to webgis via the registry: write the YAML entry, reuse or write an ingest script, load it, export it, refresh insights and docs, and deploy. Use whenever Robbie asks to add, swap, or re-vintage a dataset, or names a new source (ACS table, LODES, CDC PLACES measure, NOAA climate element, or something new).
---

# Add a dataset

**Where data files live (S2, D-210):** every value file, names, search and tract geography are written to `data/tiles/` (git-ignored) and uploaded to R2 (`https://tiles.mapwich.org`) with `npm run ingest -- publish-data`. Nothing goes in `apps/web/public/data` any more (that folder is gone). A data refresh is an upload, not a code deploy; visitors see it within the hour (one-hour cache).

The rule from CLAUDE.md: **adding a dataset = registry entry + ingest script only. No UI code.** The map, browser, legend, popups, URL state and Weird Insights all read the registry.

## 1. Check the source before writing anything (SPEC §10)

Stop and log a decision (`docs/decisions/D-<PR number + 100>-<slug>.md`; see `docs/branching.md`) instead of continuing if the source needs a paid key or login, or if its license is unclear. Federal works are public domain (17 U.S.C. § 105). State and local data need the publisher's terms checked; record the license text in the entry. Publicly published Met Council open data is allowed (D-16); internal Met Council systems are not.

## 2. Write `data/registry/datasets/<id>.yaml`

The schema is `data/registry/schema.ts` (zod). The file name must equal `id`. Copy the closest existing entry:

| Source kind | `measure.kind` | Example | Ingest script |
|---|---|---|---|
| ACS 5-year table | `acs5` (numerator/denominator variable lists, `scale`, `perSqMi`) | `pct_transit_commute.yaml` | `acs.ts` (no change needed) |
| LEHD LODES | `lodes` | `job_density.yaml` | `lodes.ts` |
| CDC PLACES | `places` (`socrata`, `measureId`) | `loneliness.yaml` | `places.ts` |
| NOAA nClimDiv | `climdiv` (`element`, `months`, `stat`, `years`) | `july_high.yaml` | `climdiv.ts` |
| Lines/points from their own geometry (HPMS, GTFS, crash or bridge points, MN Commons) | `features` (`source.url/file/path/layerPattern`, `where`, `valueField`, `fields`, `rank`, `zooms`; manual `symbology.breaks`) | `aadt.yaml` | `features.ts` (GDAL + tippecanoe; then `publish-tiles`) |
| Something new | add a schema in `schema.ts` + a script in `data/ingest/src/` + a step in `run.ts` | | |

Fields that matter beyond the obvious:
- `universe`: the population the value describes. Pairs with the same denominator universe are flagged in insights.
- `modelInputs`: other dataset ids used to *model* this one (PLACES uses county poverty). Pairs with them are flagged as "by construction".
- `symbology.ramp`: must be a ramp in `packages/design/src/ramps.ts`, and `classes` must fit its certified range. Sequential for magnitude, diverging only when there's a meaningful midpoint.
- `coverageNote`: known gaps; shown in the legend caption and data-sources doc.
- `geographyLevels`: only the levels the source really has. The UI handles county-only data.
- `phrase`: a plain noun phrase that reads after "higher" / "lower" in Odd Pairings captions ("work-from-home rates", "household incomes", "shares of renters"). Needed for any county dataset that can be paired; otherwise captions fall back to the title, which often reads badly ("higher no leisure-time exercise").

Then: `npm run registry:validate`.

## 3. Load, export, refresh

```bash
npm run ingest -- <acs|lodes|places|climdiv|nbi|fars|features> <id>   # writes public.datasets + public.dataset_values
npm run ingest -- export                             # registry.json, names.json, data/tiles/values/<id>/<level>.json, data/tiles/geo/
npm run ingest -- details                            # state/county click details, data/tiles/details/ (D-198)
npm run ingest -- publish-data                       # upload values/, geo/, details/ to R2 (only changed files go up; D-210)
npm run ingest -- insights                           # recompute pairs, checks, captions (needs ANTHROPIC_API_KEY for real captions)
npm run ingest -- docs                               # regenerate docs/data-sources.md
```

Read the ingest log: row counts, nulls, and "geoids not in geographies (dropped)". Investigate any drops above a handful (Connecticut's 2022 county change is the usual cause). Spot-check three known places (e.g. Hennepin 27053, Miami-Dade 12086, an Alaska borough).

## 4. Ship

Work in a worktree on branch `data/<dataset-id>` from the latest `origin/main` (see `docs/branching.md`); never commit to `main`. Run `npm run build` locally (it runs the design check) and the other checks in `docs/handbook.md`. Commit the regenerated `apps/web/src/generated/*.json` (registry, periods, names, insights), because the Vercel build can't reach the database. The value files are not in git: run `npm run ingest -- publish-data` **before** the PR merges, so the deployed registry never names a dataset whose files aren't on R2 yet (workers without R2 keys say so in their report and the lead runs it). For a feature layer, run `npm run ingest -- publish-tiles` first so its PMTiles are on R2. Open a draft PR with "Closes #N" right after the first commit. The lead merges it with `bash scripts/merge-pr.sh <n>`, and merging deploys production (D-23). Don't deploy by hand.
