# D-210 · Data files on R2

- **Date:** 2026-10-06
- **Status:** DEFAULTED (worker, roadmap task S2, issues #96 and #106)
- **PR:** #110

**Problem.** The map's value files lived in the site's own folder, `apps/web/public/data`
(295 MB, about 3,800 files), so every data refresh was a code deploy and the repo kept growing.
Tract place pages still asked Supabase for the tract's name, point and land area (#106).

**Decided.**

1. **Layout: the old folder, moved to the tiles base.** R2 keys mirror the old paths, beside the
   block-group values (D-124) and click details (D-198):
   `values/<id>/<level>.json`, `values/<id>/<stop>/<level>.json` (timeline, D-36),
   `values/tracts/<county fips>.json` (tract details, D-113), `geo/names.json`, `geo/places.json`,
   `geo/search.json`, and new `geo/tracts/<county fips>.json` =
   `{ "<6-digit tract>": [name, lon, lat, land sq mi] }` (3,222 files, 6.4 MB raw, 1.8 MB gzipped).
   The tract file is built from the 2024 Gazetteer with the same formula as the database's
   `geographies` rows (`ingest tract-geo`, also run by `ingest geographies`), so it needs no database.
2. **Reading:** `apps/web/src/lib/static-files.ts` holds `TILES_BASE` (`NEXT_PUBLIC_TILES_BASE_URL`,
   else `/tiles`) and `staticUrl(path)`. `values.ts`, `details.ts`, `csv.ts`, `search.ts`,
   `DataTable` and `InsightDetail` read through it. `fetchGeography` reads tracts from
   `geo/tracts/`, so the browser makes no database call anywhere on the map or place pages.
3. **Freshness: fixed keys, one-hour cache.** Every JSON object is uploaded gzip-encoded with
   `Cache-Control: public, max-age=3600` (block-group values were 86,400 s; now the same hour as
   details). A version or hash in the path would need the version committed with the code, so a
   data refresh would need a deploy again, which is what S2 removes. Worst case a visitor sees the
   previous upload for an hour. Adding a dataset, level or timeline stop still changes the
   committed registry and `periods.json`, so the upload must come before that PR merges.
4. **Upload: one command, only what changed.** `npm run ingest -- publish-data [ids…]` uploads
   `values/`, `geo/` and `details/` (`publish-values`, `publish-geo`, `publish-details` do one part).
   It lists the prefix once, skips files whose gzipped MD5 matches the object's ETag, and sends the
   rest 16 at a time. Ingest steps write to `data/tiles/` (git-ignored) instead of `public/data`.
5. **Build inputs stay in git.** County and state names (95 KB) are also written to
   `apps/web/src/generated/names.json`, which share cards and Specials bundle. The Specials build
   step (`scripts/prepare.mts`) reads the few county value files it needs from `data/tiles` when
   present, else fetches them from the tiles base (`https://tiles.mapwich.org` when the variable
   is unset), so Vercel, CI and a fresh clone build without the files on disk.
6. **Local dev and e2e:** unchanged pattern. `public/tiles` links to `data/tiles`; a filled
   `data/tiles` runs offline. New e2e cases (end of `menus.spec.mjs`): every level draws and
   clicks with no request under the site's `/data/values` or `/data/geo` and no database call, a
   tract place page reads `geo/tracts/`, and CSV downloads at all four levels have rows.

**Sizes.** Repo working tree: −295 MB (`apps/web/public/data` deleted), +95 KB (`names.json`).
Git history keeps the old files. New on R2: 3,813 value files (85.1 MB gzipped) + geo
(0.6 MB) + tract geography (1.8 MB) ≈ **87.5 MB**, so R2 goes from about 4.1 GB to about 4.2 GB of
the 10 GB free tier.

**Not changed.** Supabase stays the ingest store (state and county values, geographies) and
holds Odd Pairing approvals and reviewer sign-in. Tract and timeline values were never in the
database: from now on R2 (and the ingest machine's `data/tiles`) is their only copy.

**Checked.** Against live mapwich.org at phone and laptop sizes: fill colors (every fill layer's
paint expression) and the details panel text were identical for states, counties, tracts and
block groups across four datasets and a timeline stop; tract place pages (Hennepin, Cook,
Los Angeles, San Juan) showed the same heading, land area and map links with no database request.
