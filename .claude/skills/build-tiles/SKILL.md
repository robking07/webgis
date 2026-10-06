---
name: build-tiles
description: Build and publish webgis boundary vector tiles (PMTiles) from Census cartographic boundary files with tippecanoe, and upload them to Cloudflare R2. Use when boundaries change vintage, a new geography level is added (e.g. block group, place), tiles look wrong (missing features, gaps, oversimplified edges), or R2/CORS needs fixing.
---

# Build and publish boundary tiles

Boundary tiles carry **geometry + `geoid` + `name` only**. Values are joined in the browser through MapLibre feature state (`promoteId: "geoid"`), so tiles never change when a dataset is added. Don't bake data into tiles.

## Build

```bash
npm run ingest -- tiles [state|county|tract]
```

`data/ingest/src/tiles.ts` downloads `cb_<year>_us_<level>_500k.zip`, streams features to GeoJSONSeq, and runs tippecanoe with:
- `--detect-shared-borders`: neighboring polygons simplify identically, so there are no slivers.
- `--no-feature-limit --no-tile-size-limit --no-tiny-polygon-reduction`: a choropleth must never drop polygons. Don't swap in `--drop-densest-as-needed` or `--coalesce-*`.
- Zoom ranges per level (`LEVELS` in tiles.ts) overlap the display bands in `packages/design/src/sizing.ts` `GEO_LEVELS`. Keep them consistent: tiles must exist at every zoom where the layer is shown (overzoom covers higher zooms).
- Do **not** use `--use-attribute-for-id`: GEOIDs have leading zeros and would be mangled into integers.

tippecanoe lives in `~/.local/bin` (unpacked from the Ubuntu .deb without sudo). If it's missing: `apt download tippecanoe && dpkg -x tippecanoe_*.deb x && cp x/usr/bin/* ~/.local/bin/`.

Check a tile: `tippecanoe-decode -c data/tiles/county.pmtiles 5 7 11 | head`.

## Feature layers (lines/points)

`npm run ingest -- features <id>` (`data/ingest/src/features.ts`) builds `<id>.pmtiles` from a registry `features` entry: `ogr2ogr` extracts the kept fields from every layer matching `layerPattern` (inside a zip via `/vsizip/`), then tippecanoe builds the tiles, thinned by the entry's `rank` with a `-j` feature filter, plus `--drop-densest-as-needed` as a safety net. GDAL comes from the micromamba env `gis` (`~/.local/share/mamba/envs/gis/bin`, linked into `~/.local/bin`). To recreate it: `micromamba create -n gis -c conda-forge gdal`.

## Publish

```bash
npm run ingest -- publish-tiles
```

This uploads `data/tiles/*.pmtiles` to the `R2_BUCKET` and sets the bucket CORS rule (GET/HEAD, `range` header, exposes `content-range`/`etag`). Allowed origins are listed in `publish-tiles.ts`; add new ones there (e.g. a custom domain). Verify:

```bash
B=$(grep '^NEXT_PUBLIC_TILES_BASE_URL=' .env.local | cut -d= -f2-)
curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=0-126" -H "Origin: https://mapwich.org" "$B/county.pmtiles"   # expect 206
```

Tiles are served from the custom domain `https://tiles.mapwich.org` (R2 custom domain; `NEXT_PUBLIC_TILES_BASE_URL`, also set in CI). The old r2.dev URL is rate-limited and development-only; don't use it (D-01, Q-2).

## Local dev

`apps/web/scripts/prepare.mts` symlinks `apps/web/public/tiles → data/tiles`. Without `NEXT_PUBLIC_TILES_BASE_URL` the app reads `/tiles/<level>.pmtiles` locally (Next serves range requests).
