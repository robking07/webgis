# D-552 · Data run: map layers from files, and values-only re-export

- **PR:** #452 (closes #449, #453). Extends D-478 (the Data run).

**Problem.** TIP projects (#446) is a `features` layer: it needs GDAL, tippecanoe and `publish-tiles`, none of which the Data run had. And the 7-digit rounding (#445, D-545) reaches the live files only after `export-values` and a publish for every map, which the Data run couldn't do without reloading every source.

**Decided.** Two new step values, each allowed only alone (`data/ingest/src/check-run.ts`):

- `features` (typed exactly so): on `ubuntu-24.04`, the run installs `gdal-bin` and `tippecanoe` (2.49) from Ubuntu's packages, runs `ingest features <ids>`, and stops if the `layers.json` it wrote differs from main's, so tiles and manifest can't drift apart. Then `publish-tiles <ids>` uploads only those tiles. With ids named, `publish-tiles` no longer sets the bucket CORS rule (a local `publish-tiles` with no ids still does), so routine uploads need no bucket-admin key. No values are exported or published.
- `export-values`: loads nothing. Runs `export-values` (every registry map when `datasets` is empty, else only those), `details` and `similar`, then the same `publish-reload`, `publish-details` and `publish-similar` as a load. `datasets` is no longer a required input; `check-run` still requires ids for every other step.

Two guards make the every-map re-export safe:

- `export-values` exports only ids in this checkout's registry and never the tract level, as `tracts-out` does: the database is shared with parked or unmerged branches (FEMA #169, HUD #172).
- `publish-values` now refuses a map's `state.json` or `county.json` with fewer places than the live file (unless `ALLOW_TRACT_DROP=1`). It compares counts, not keys, so a real boundary change (Connecticut's 2022 counties) still goes through.

No new secrets; keys stay in the `data` environment as env only. The 180-minute timeout stays: a re-export writes only state and county files, far fewer than #373's 142k.

**Similar counties on a runner (#453).** `similar` reads `values/population_density/county.counts.json`, which only a population load writes, so every other Data run failed there (run 41240260580). When the file is missing, `similar` reads the live one from R2 (`getLive`) and keeps it in memory, so a stale copy is never written into `data/tiles/values/` or re-uploaded. `details` reads only the database; `similar` reads only what `details` just wrote plus this file.

**Limits.** A re-export can't re-round tract values; D-545 says those already match.
