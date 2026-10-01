---
name: add-dataset
description: Add a dataset to webgis via the registry: write the YAML entry, reuse or write an ingest script, load it, export it, refresh insights and docs, and deploy. Use whenever Robbie asks to add, swap, or re-vintage a dataset, or names a new source (ACS table, LODES, CDC PLACES measure, NOAA climate element, or something new).
---

# Add a dataset

The rule from CLAUDE.md: **adding a dataset = registry entry + ingest script only. No UI code.** The map, browser, legend, popups, URL state and Weird Insights all read the registry.

## 1. Check the source before writing anything (SPEC §10)

Stop and log to `docs/DECISIONS.md` instead of continuing if the source needs a paid key or login, or if its license is unclear. Federal works are public domain (17 U.S.C. § 105). State and local data need the publisher's terms checked; record the license text in the entry. Publicly published Met Council open data is allowed (D-16); internal Met Council systems are not.

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

Then: `npm run registry:validate`.

## 3. Load, export, refresh

```bash
npm run ingest -- <acs|lodes|places|climdiv|nbi|fars|features> <id>   # writes public.datasets + public.dataset_values
npm run ingest -- export                             # registry.json, names, public/data/values/<id>/<level>.json
npm run ingest -- insights                           # recompute pairs, checks, captions (needs ANTHROPIC_API_KEY for real captions)
npm run ingest -- docs                               # regenerate docs/data-sources.md
```

Read the ingest log: row counts, nulls, and "geoids not in geographies (dropped)". Investigate any drops above a handful (Connecticut's 2022 county change is the usual cause). Spot-check three known places (e.g. Hennepin 27053, Miami-Dade 12086, an Alaska borough).

## 4. Ship

`npm run build` locally (it runs the design check), then commit and `git push` to `main`: Vercel builds and deploys production automatically (D-23). Commit the regenerated `apps/web/public/data/values/**` and `apps/web/src/generated/*.json`, because the Vercel build can't reach the database. For a feature layer, run `npm run ingest -- publish-tiles` first so its PMTiles are on R2. Fallback: `vercel deploy --prod -y` with `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` from `.env.local` (D-18).
