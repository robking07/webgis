# D-478 · Data runs on GitHub (manual v1)

- **Date:** 2026-10-28
- **Status:** DEFAULTED (worker; lead to confirm)
- **PR:** #378

A dataset reload and publish can now run on GitHub instead of Robbie's machine (#369):
`.github/workflows/data-run.yml`, started by hand from the Actions tab with the ingest steps and the
dataset ids. It checks the inputs (`check-run.ts`), runs the steps, `export-values <ids>` and
`details`, then `publish-reload` and `publish-details`. How to run it and Robbie's setup:
`docs/runbook.md` section 8.

**Why it can't publish from a partial `data/tiles`.** A runner starts empty, so its `data/tiles`
holds only what this run loaded. Only files holding many datasets can lose data that way: the tract
files (`values/tracts/<county>.json`), the tract and block-group count files
(`values/counts/<level>/<county>.json`) and the click details (`details/<state>.json`).

1. **Merge at upload time.** `publish-reload` takes the keys found in the run's tract and count files
   as "reloaded". For every county file live on R2 or written by the run, it fetches the live copy
   through the S3 API (authoritative, no cache), swaps in only the reloaded datasets or count series,
   and keeps everything else as it is. Every other dataset is carried over by construction.
2. **Check everything, then upload.** If any county would lose a reloaded dataset (a source that
   came back short), the run stops before the first upload. `ALLOW_TRACT_DROP` is never set on
   GitHub. The #143 guard still re-checks each changed file as it goes up. Click details are rebuilt
   from the database, which holds every state and county value, and go up last.
3. **Never more than it wrote.** Uploads skip unchanged files (ETag) and never delete. `geo/` isn't
   uploaded. A run that loaded no tract or block-group values has no count or tract files and skips
   the merge.

Simulated on 2026-10-28 against a fake R2 holding the 3,222 live tract files: a `pct_poverty` reload
with one changed value uploaded exactly one file and kept all 77 datasets. The same reload missing
one county stopped with "nothing uploaded".

**Defaults taken (alternatives noted):**

- **Merge at upload time, not a copy first.** An earlier version of this PR copied all 3,222 tract
  files from the public host before loading. The lead's review replaced that: it read a cacheable
  copy, missed the count files and left a window for a stale overwrite. The merge GETs each live
  file once, minutes before the PUT; the remaining window is a local publish during a run.
- **No dry-run switch.** "Upload off" still wrote the production database, so it wasn't a dry run.
  A true one would need a no-write mode in every ingest. The input check runs before anything is
  written, and the first try is a small county-only dataset.
- **Values export only** (`export-values`, new): `export` also rebuilt names and search, which
  download Gazetteer files a run would throw away.
- **Scope v1 to steps without GDAL or tippecanoe**: acs, acs-bg, lodes, places, climdiv, nbi, fars,
  airquality, overdose, cejst, tri, lead, food-access, nri, svi, timeline (not for fars).
  Alternative: `apt install gdal-bin tippecanoe` in the job (about a minute) when a step needs it.
- **Each step must load each dataset named**, so a run can't go green having loaded nothing.
- **Refreshes of existing datasets only.** The run commits nothing, so a new dataset, level or
  timeline stop still goes through a PR (registry and `periods.json`), with the upload before merge.
  Insight captions aren't refreshed by a run.
- **Keys in a GitHub environment named `data`, limited to the `main` branch**, not plain repo
  secrets. Repo secrets reach any workflow on any pushed branch; an environment's reach only the
  branches it allows. `ANTHROPIC_API_KEY` stays off GitHub.
- **No schedule yet.** The repo is public, so GitHub-hosted runner minutes are free; a run is
  estimated at 6 to 12 minutes. A weekly cron is a one-line switch later.

## Amendments
