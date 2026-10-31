# D-552 · Data run: map layers from files, and values-only re-export

- **PR:** #452 (closes #449). Extends D-478 (the Data run).

**Problem.** TIP projects (#446) is a `features` layer: it needs GDAL, tippecanoe and `publish-tiles`, none of which the Data run had. And the 7-digit rounding (#445, D-545) reaches the live files only after `export-values` and a publish for every map, which the Data run couldn't do without reloading every source.

**Decided.** Two new step values, each allowed only alone (`data/ingest/src/check-run.ts`):

- `features`: the run installs `gdal-bin` and `tippecanoe` from Ubuntu's packages, runs `ingest features <ids>`, then `publish-tiles <ids>`. No values are exported or published; the map's `layers.json` entry ships in git with its registry PR, as before.
- `export-values`: loads nothing. Runs `export-values` (every map when `datasets` is empty, else only those), `details` and `similar`, then the same `publish-reload`, `publish-details` and `publish-similar` as a load, so every drop check and `ALLOW_TRACT_DROP` still apply. `datasets` is no longer a required input; `check-run` still requires ids for every other step.

No new secrets; keys stay in the `data` environment as env only. The 180-minute timeout stays: a re-export writes only state and county files (tract files aren't in the database), far fewer than #373's 142k.

**Limits.** `publish-tiles` also sets the bucket's CORS rule, so the GitHub R2 token needs bucket-settings permission; if it is object-only, the first features run fails before uploading. Ubuntu 24.04's tippecanoe is 2.49 (Robbie's machine may be newer). A re-export can't re-round tract values; D-545 says those already match.
