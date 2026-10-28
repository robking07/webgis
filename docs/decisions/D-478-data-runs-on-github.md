# D-478 · Data runs on GitHub (manual v1)

- **Date:** 2026-10-28
- **Status:** DEFAULTED (worker; lead to confirm)
- **PR:** #378

A dataset reload and upload can now run on GitHub instead of Robbie's machine (#369):
`.github/workflows/data-run.yml`, started by hand from the Actions tab with the ingest steps, the
dataset ids and an "upload" switch (off by default). It runs `pull-tracts`, the named steps,
`export <ids>` and `details`, then (upload on) `publish-values <ids> tracts` and `publish-details`.
Steps are in `docs/runbook.md` section 8.

**Why it can't publish from a partial `data/tiles`.** Only files that hold many datasets can lose
data when rebuilt from a fresh checkout; every other file is one dataset's values, rebuilt whole.

1. The many-dataset files a run uploads are the tract shards (`values/tracts/<county>.json`) and the
   click details (`details/<state>.json`). The runner first copies every live tract shard from
   `https://tiles.mapwich.org` (new `ingest pull-tracts`), so a reload merges into the published
   shards, exactly as on a complete checkout. Details are rebuilt from the database, which holds
   every dataset's state and county values (they're built that way on Robbie's machine too).
2. The existing guard (#143) still re-reads each changed shard from R2 just before uploading it and
   stops the run if any live dataset would disappear. The workflow never sets `ALLOW_TRACT_DROP`.
   A shard that failed to copy would hold only the reloaded dataset, so the guard stops it.
3. Uploads never delete anything, and the count shards (`values/counts/`) and geography files
   (`geo/`) aren't uploaded at all (the `counts` step needs GDAL and isn't offered).

Checked on 2026-10-28: all 3,222 shards copy in about 70 s from a home connection (147 MB), and
re-writing them reproduces the live bytes exactly, so unchanged shards are skipped by the ETag check.

**Defaults taken (alternatives noted):**

- **Copy over HTTPS from the public host**, not with the R2 keys. No key needed and runnable
  anywhere; the copy uses a cache-busting query. Alternative: list and fetch through the S3 API.
- **Scope v1 to steps without GDAL or tippecanoe**: acs, acs-bg, lodes, places, climdiv, nbi, fars,
  airquality, overdose, cejst, tri, lead, food-access, nri, svi, timeline. Not offered: geographies,
  tiles, features, census2020, ddp287g, vmt, counts, label-mask, mpo, insights, combinations and
  anything that changes committed files. Alternative: `apt install gdal-bin tippecanoe` in the job
  (about a minute) when a step needs it.
- **Refreshes of existing datasets only.** The run commits nothing, so a new dataset, level or
  timeline stop still goes through a PR (registry and `periods.json`), with the upload before merge.
  Insight captions aren't refreshed by a run.
- **Keys in a GitHub environment named `data`, limited to the `main` branch**, not plain repo
  secrets. Repo secrets reach any workflow on any pushed branch; an environment's reach only the
  branches it allows. `ANTHROPIC_API_KEY` stays off GitHub.
- **No schedule yet.** The repo is public, so GitHub-hosted runner minutes are free; a run is
  estimated at 6 to 12 minutes. A weekly cron is a one-line switch later.

## Amendments
