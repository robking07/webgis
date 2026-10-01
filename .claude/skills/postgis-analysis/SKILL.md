---
name: postgis-analysis
description: Spatial and statistical analysis against the webgis Supabase/PostGIS database: connecting through the IPv4 session pooler, the schema (datasets, geographies, dataset_values, insights), RLS rules, writing migrations, and doing spatial work (adjacency, point-in-polygon, area weighting) without breaking the 500 MB free-tier budget. Use for any SQL, migration, or analysis task on this project's database.
---

# PostGIS analysis for webgis

## Connect

- Use `SUPABASE_DB_URL` from `.env.local`. It is the **session pooler** (`aws-0-us-east-1.pooler.supabase.com:5432`, user `postgres.<ref>`). The direct `db.<ref>.supabase.co` host is IPv6-only and unreachable from WSL (D-10).
- No `psql` installed; use node `pg` with `ssl: { rejectUnauthorized: false }` (see `data/ingest/src/util.ts` `db()`).
- Development runs against the hosted project only, with no local Docker stack (D-09). Treat every write as production.

## Schema (supabase/migrations)

| Table | Holds | Notes |
|---|---|---|
| `datasets` | one row per registry entry, full entry in `entry jsonb` | written by `registerDataset()` |
| `geographies` | ~88k states/counties/tracts: `geoid`, `level`, `name`, `aland_sqmi`, `lon`/`lat` internal point | **no geometry**; geometry lives in PMTiles |
| `dataset_values` | `(dataset_id, level, geoid)` → `value`, `moe` | replace per dataset+level with `writeValues()` |
| `insights` | pair stats, flags, captions; `status` published/flagged | anon can read only `published` |

RLS is on for every table: `anon`/`authenticated` get SELECT only; writes go through the service role / DB URL. New tables in `public` must enable RLS and add explicit policies plus `grant select` (see the `supabase` skill).

## Migrations

Add `supabase/migrations/<yyyymmddhhmmss>_<name>.sql`, then `npm run db:migrate` (Supabase CLI `db push --db-url`). Never edit an applied migration; write a new one.

## Size budget (SPEC §10: stop if it would exceed 500 MB)

Check before any bulk load:

```sql
select pg_size_pretty(pg_database_size(current_database()));
select relname, pg_size_pretty(pg_total_relation_size(relid)) from pg_statio_user_tables order by pg_total_relation_size(relid) desc;
```

Each dataset at all 3 levels is ~89k rows (~10 MB with indexes). Geometry does not go in the database. If an analysis needs polygons, load a **temporary** table in a separate schema, compute, keep only the attribute results, and drop it.

## Spatial work

PostGIS lives in the `extensions` schema: call `extensions.st_*` or `set search_path = public, extensions`.

- **County adjacency (for spatial-autocorrelation checks):** load `cb_2024_us_county_500k` into a temp table with `ogr2ogr` (GDAL not yet installed, see D-06) or with node `shapefile` + `ST_GeomFromGeoJSON`, then `select a.geoid, b.geoid from tmp a join tmp b on a.geoid < b.geoid and st_touches(a.geom, b.geom)`. Store only the edge list.
- **Point-in-polygon aggregation** (e.g. bridges or crashes per county): prefer joining on the county FIPS already in the source. Use a spatial join only when there's no code, and use `geography` or an equal-area projection (EPSG:5070) for area.
- **Area-weighted interpolation** between vintages or units: intersect in EPSG:5070, weight by `st_area(st_intersection)/st_area(source)`.

## Statistics conventions (Weird Insights)

Correlations run at county level in `data/ingest/src/insights.ts`, not in SQL, so the checks stay in one place: Spearman ρ (headline), Pearson r (outlier check), within-state ρ (regional check), n ≥ 500, shared denominators/variables/model inputs. If you add a check, add it there and document the rule on the insights page.
