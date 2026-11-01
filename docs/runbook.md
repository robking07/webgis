# Runbook

For Robbie and any agent. When something is broken, start here. Rules and checks: `docs/handbook.md`.
Where code lives: `docs/architecture.md`. No secret values appear in this file, only names.

## 1. Site down or a bad deploy

First look at the Vercel dashboard (Deployments) and the Sentry issue list: did it start with a deploy?

**Fastest fix: Vercel Instant Rollback** (about a minute, no code):

1. Vercel dashboard, project `webgis`, Overview. On the Production Deployment tile click **Instant Rollback**.
2. On the Hobby plan it offers the immediately previous production deployment only. Select it, **Continue**,
   check the domain list (`mapwich.org`, `www`), then **Confirm Rollback**.
3. Vercel then stops auto-assigning production, so new merges will not go live. When the fix is merged, click
   **Undo Rollback** on the same tile and promote the newest deployment. Do not forget this step.
4. A rollback restores the old build, so environment variable changes made since then are not applied.

(Source: vercel.com/docs/instant-rollback, checked 2026-10-05.)

**The git way (permanent fix):** on a new worktree branch from `origin/main`, run
`git revert -m 1 <merge-commit-sha>` for the bad PR (the merge commit is the "Merge pull request #N"
line in `git log`), push, open a draft PR, mark it ready when CI is green, and merge with
`bash scripts/merge-pr.sh <n>`. Vercel deploys `main` automatically. Never force-push; the guardrails
hook blocks it anyway.

**If only data looks wrong** (tiles, values): the data is not in the deploy. Tiles live on R2, values
are committed JSON (so revert the PR) and Supabase rows (see section 6).

## 2. Where alerts go

See `docs/handbook.md` section 7 (Sentry errors, Sentry uptime on `https://mapwich.org`, R2 spend
notification, all by email to Robbie). Vercel Hobby and Supabase free cannot bill.

## 3. Services

All accounts are owned by Robbie. Dashboards need his login.

| Service | Mapwich uses it for | Dashboard | Free-tier limit to know | If it is down |
| --- | --- | --- | --- | --- |
| GitHub (`robking07/webgis`, private) | Code, issues, PRs, CI, Dependabot | github.com/robking07/webgis | 2,000 Actions minutes a month (private repo) | Site keeps running; no merges or deploys |
| Vercel (project `webgis`) | Hosts the site, preview per PR, daily keepalive cron | vercel.com (project `webgis`) | Hobby: non-commercial use only; hard limits, no bill | Site is down. Roll back or wait |
| Supabase (Postgres + PostGIS) | Ingest's store for state and county values (the source of the R2 value and click-detail files), Odd Pairing approvals, reviewer sign-in | supabase.com/dashboard | 500 MB database; pauses after about a week idle (the keepalive cron prevents it) | Map, details panel and every place page keep working (static files, D-198, D-210); reviewer login fails |
| Cloudflare R2 (bucket `webgis`, domain `tiles.mapwich.org`) | Boundary and feature PMTiles (range requests from browsers), every value file (`values/`), names, search and tract geography (`geo/`), state/county click details (`details/`) | dash.cloudflare.com, R2 | 10 GB stored, no egress fees; spend notification set (≈4.2 GB used after D-210) | Map has no boundaries or colors; details panel, search, CSV downloads and place pages fail |
| Cloudflare (registrar and DNS) | `mapwich.org` domain | dash.cloudflare.com | Domain renews yearly | Site and tiles unreachable by name |
| Sentry (project `mapwich`) | Browser error reports, uptime monitor | sentry.io | Developer plan: small monthly error quota, 1 uptime monitor | No alerts; site unaffected |
| OpenFreeMap | Basemap (streets, labels), no account | openfreemap.org | Free, no key | Basemap gone; the map looks empty |
| Census API | Ingest only (not the live site); key `CENSUS_API_KEY` | api.census.gov/data/key_signup.html | Keyed use, generous daily limit | New ingests stall; site unaffected |
| Anthropic API | Ingest `insights` captions only (templates are used when the key is unset) | console.anthropic.com | Pay per use; set a spend limit there | Captions fall back to templates; site unaffected |

Status pages: githubstatus.com, vercel-status.com, status.supabase.com, cloudflarestatus.com,
status.sentry.io. OpenFreeMap has no status page (check openfreemap.org or its GitHub issues).
Free-tier numbers drift; confirm on the vendor pricing page before relying on one.

## 4. Contacts

- **Robbie**: owner of every account and the only person who can log in to the dashboards. Reach him
  through the project lead (`claude --agent lead`) or GitHub (`@robking07`).
- Vendors: status pages above first; support is through each dashboard's help link.

## 5. Secrets

Names only. Never print, commit or pass a secret on a command line. Three places hold them:
**local** = `.env.local` at the repo root (git-ignored, Robbie's machine), **Vercel** = project
Settings, Environment Variables, **GH** = repo Settings, Secrets and variables, Actions, **GH data** =
repo Settings, Environments, `data` (main branch only; the data run in section 8 reads it).
After rotating anything in Vercel, redeploy (values are read at build or start).

| Name | Lives in | Rotate |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design) | local, Vercel, GH | Supabase, Project Settings, API keys; update all three places, redeploy |
| `SUPABASE_DB_URL` (session-pooler string with the DB password) | local, GH data | Supabase, Project Settings, Database, reset password; update the string in both places |
| `NEXT_PUBLIC_TILES_BASE_URL` (public: `https://tiles.mapwich.org`; also set in `ci.yml`) | local, Vercel | Not a secret; change only if the tile domain moves |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | local, GH data (its own token, section 8) | Cloudflare, R2, Manage API tokens: create a new token, update `.env.local` (or GH data), delete the old one |
| `CRON_SECRET` | Vercel (Vercel sends it on cron calls) | Set a new random value in Vercel and redeploy |
| `NEXT_PUBLIC_SENTRY_DSN` (public, ships to browsers) | Vercel, local | Sentry, Project Settings, Client Keys; rotating is rarely needed |
| `CENSUS_API_KEY` | local, GH data | Request a new key from the Census signup page; update both places |
| `ANTHROPIC_API_KEY` | local only | console.anthropic.com, API keys: create, update `.env.local`, revoke the old one |
| GitHub, Vercel, Supabase, Cloudflare, Sentry logins | Robbie's password manager | Each vendor's account security page |

If a secret leaks (gitleaks fails a PR, or one appears in a log): rotate it first, then clean up.

## 6. Rebuild from scratch: how you would

Steps marked (drill) were run on 2026-10-05; the rest were read from the docs and skills, not run.

1. Clone, `npm ci` (Node 24), `npm run build`, `npm run start -w web`. Needs no keys. (drill)
2. **Vercel:** create a project from the GitHub repo, Root Directory `apps/web`, framework Next.js
   (confirm both against the existing project's settings), add the Vercel secrets from section 5,
   attach `mapwich.org` (Cloudflare DNS). `apps/web/vercel.json` carries the cron.
3. **Supabase:** new project, set `SUPABASE_DB_URL` (session pooler), run `npm run db:migrate`
   (applies `supabase/migrations/`). Needs the DB password.
4. **Data:** `npm run ingest -- geographies`, then one step per source kind for each dataset
   (`acs`, `lodes`, `places`, ... see `data/ingest/src/run.ts` or the `add-dataset` skill), then
   the timeline steps, `ingest -- export`, `ingest -- tract-geo`, `ingest -- insights`, `ingest -- details`, then
   `ingest -- publish-data` (values, geo and details to R2; see "Re-upload the data files" below).
   Needs `SUPABASE_DB_URL`, `CENSUS_API_KEY` (optional `ANTHROPIC_API_KEY`), and GDAL for feature
   layers. The value files are not in git (D-210): R2 holds the published copy, so the live site keeps
   rendering as long as the bucket is intact; tract and timeline values exist only there and on the
   machine that ran the ingest, and rebuilding them means re-running their ingests.
5. **Tiles:** `ingest -- tiles [state|county|tract]`, `ingest -- features <id>`, then
   `ingest -- publish-tiles` to the R2 bucket (sets CORS). Needs `tippecanoe`, `ogr2ogr` and the four
   `R2_*` names. `data/tiles/` is git-ignored and empty in a fresh clone, so tiles must be rebuilt.
   Bind `tiles.mapwich.org` to the bucket as an R2 custom domain.
6. Sentry: the handbook section 7 checklist.

### Re-upload the data files (D-210)

The map's value files, names, search index, tract geography and click details live in `data/tiles/`
(git-ignored) and are served from R2 at `https://tiles.mapwich.org/{values,geo,details}/...`,
gzip-encoded with `Cache-Control: public, max-age=3600`. After any ingest that rewrites them:

```sh
npm run ingest -- publish-data            # everything: values/, geo/, details/
npm run ingest -- publish-data <id> ...   # just these datasets' values/<id>/ folders
```

It needs the four `R2_*` names in `.env.local`. It compares each gzipped file with the object's
ETag and uploads only what changed (a full first upload is about 3,800 value files, 87 MB gzipped).
Visitors see new files within an hour; nothing needs a deploy unless the registry changed (a new
dataset, level or timeline stop), and then the upload must come first, before the PR merges.
Check one file: `curl -sI https://tiles.mapwich.org/values/median_household_income/county.json`
(expect `200`, `content-encoding: gzip`, `cache-control: public, max-age=3600`).

## 7. Rebuild drill, 2026-10-05

Fresh `git clone` of `main` into a scratch folder, following only the docs. WSL2, Node 24.21, npm
11.19. No `.env.local` existed in the clone and nothing was written to a live service.

| Step | Result | Time |
| --- | --- | --- |
| `git clone` | ok | 5 s |
| `npm ci` | ok (audit and one install-script warning) | 18 s |
| `npm run build` (no env vars) | ok; 60 dataset pages plus Specials prerendered | 16 s |
| `npm run start -w web -- -p 3199` | ready in 0.13 s | 6 s |
| `curl /` | 200, 11 KB | 0.06 s |
| `curl /data/aadt` | 200, 43 KB, title "Traffic volume (AADT)" | 0.01 s |
| `curl /api/keepalive` | 500 (no `CRON_SECRET`, no Supabase); expected without keys | n/a |
| `npm run registry:validate` | "registry valid: 60 datasets" | 0.5 s |
| `ogr2ogr --version` | GDAL 3.13.3 | n/a |
| `tippecanoe --version` | v2.53.0 | n/a |

Not run on purpose: `npm run ingest -- *`, `db:migrate`, `publish-tiles`, Vercel deploys.

The site itself rebuilds in about a minute with no keys. The slow, key-dependent part is the data
side (database, tiles), which the drill could only read, not run.

Gaps found:

| Gap | Status |
| --- | --- |
| No `README.md`; a stranger landing on the repo has no front door | Follow-up (short README pointing to handbook, runbook, architecture) |
| Handbook section 1 did not say what a no-key build does (it works; keepalive 500s; map reads `/tiles/...` locally, which is empty) | Fixed in handbook section 1 |
| Handbook section 1 did not say ingest needs GDAL and tippecanoe or how to check | Fixed |
| `add-dataset` skill step 4 says `git push` to `main`, which the branching rules and guardrails forbid | Follow-up (skill edit) |
| `build-tiles` skill verify step uses `webgis-lac.vercel.app` as the origin; the live one is `mapwich.org` | Follow-up (skill edit) |
| `build-tiles` skill and `publish-tiles.ts` described the r2.dev URL | Fixed in #91: skill uses `tiles.mapwich.org`; CORS verified for https://mapwich.org |
| Vercel project settings (Root Directory, framework) and the Supabase project ref are written nowhere in the repo | Follow-up for Robbie: read them from the dashboards once and add to section 6 |
| No backup or restore path for Supabase (free tier has none); restoring means re-running every ingest step | Follow-up (decide whether a periodic `pg_dump` is worth it) |
| Whether `ingest -- all` covers every registry dataset was not checked | Follow-up |
| No `.env.example`; a names-only template would make setup safer | Fixed (names-only `.env.example` added) |
| Handbook section 7 had no pointer to this runbook | Fixed |

## 8. Data runs on GitHub (D-478)

A dataset refresh can run on GitHub instead of Robbie's machine: `.github/workflows/data-run.yml`.

**Run one:** GitHub, Actions, "Data run", "Run workflow" (branch `main`). Fill in:

- **steps**, run in order: e.g. `acs`, or `acs timeline`. Allowed: acs, acs-bg, lodes, places,
  climdiv, nbi, fars, airquality, overdose, cejst, tri, lead, food-access, nri, svi, timeline.
- **datasets**: the ids, e.g. `pct_poverty median_household_income`. Every step must load every
  id (`acs` with a FARS id is refused before anything runs; `data/ingest/src/check-run.ts`).

Three more ways to run, each with that step alone (D-552, D-557):

- **A map layer from files** (`features` in the registry, e.g. TIP projects): steps `features`,
  datasets `tip_projects`. The run installs GDAL and
  tippecanoe, builds `<id>.pmtiles`, and uploads only those tiles (`publish-tiles <ids>`, which
  leaves the bucket's CORS rule alone); no values are touched. The registry and `layers.json` entry
  must already be on `main` (they ship with the dataset's PR): if the load writes a different
  `layers.json` (say the source gained features), the run stops before uploading. Regenerate it in a
  PR, merge, run again.
- **Re-export values, no reload** (e.g. after a rounding change like D-545): steps `export-values`,
  datasets empty for every registry map (or ids for just those). It loads nothing: it rewrites the
  state and county value files from the database (registry ids only, never tracts), then publishes
  exactly as below, with the same checks.
- **Commute flows** (#469): steps `commute`, datasets empty. It downloads every state's LODES
  origin-destination files (`main` + `aux`, all jobs, the registry's LODES year), writes
  `commute/commute.json` and uploads only that file. No database, no values; run it when `job_density`
  moves to a new year.
- **Margins and counts only** (D-257: every period's `<stop>/<level>.moe.json`, the counts files,
  the U.S. rows and the tract and block-group count shards), ACS maps only: steps `counts`, datasets
  the ids (required). It fetches from the Census API and reads land areas from the database, writes
  nothing else (no database rows, no value files), then runs `details` and `similar` and publishes
  exactly as below: the count shards are merged into the live ones and every check runs. Similar
  counties are rebuilt because they read `population_density`'s counts. D-557 lists the ids of
  every ACS change map (a `timeline` in the registry).

There is no dry-run switch: every run writes the database (`counts` only reads it) and publishes. Visitors see new values
within an hour. The run loads, then `export-values <ids>` (not for `counts`), `details` (from the
database) and `similar`, then
`publish-reload`: for each tract or block-group count file it wrote, it fetches the live file from R2,
swaps in only the reloaded datasets and keeps the rest. If any county would lose a reloaded dataset (a
source that came back short), it stops **before the first upload**. Tract values need no merge: each
map has its own file per county, `values/<id>/tracts/<county>.json` (D-506). Before uploading anything,
`publish-values` checks every changed file: a count shard that drops a live dataset, a map's tract
file that drops live tracts, a map's state or county values, margins (tract too, any period) or counts with fewer places than the
live one, or a
reloaded map with a county file on R2 that this load doesn't have (it would stay live with old
numbers, since publish never deletes). If any check fails, **nothing is
uploaded**. Then it uploads the changed value files, and the click details last. A run that writes
no count files skips the merge.

**A real loss** (a new tract vintage, a county a source no longer covers): tick **Allow tract drop**
when starting the run. It sets `ALLOW_TRACT_DROP=1` for the publish step only and skips those
checks, so use it only after reading the refused run's list of files.

**Split tract files (one-off, D-506).** The "Split tract files" workflow (Actions tab, main only)
reads every old all-maps file `values/tracts/<county>.json` from R2 and uploads the per-map files.
Since this change no ingest writes the old files; they stay on R2 for rollback. Run no Data run or
local reload between merging the new writer and the web switch to the per-map files.

**Raw downloads (#368).** The last step, "Save raw downloads to R2", copies every file the run
downloaded into `data/cache/` to R2 under `raw/`, same relative path (a file with no year in its path
gets the run date: `raw/fema-nri-county.2026-10-31.json`). It never deletes and never overwrites: a key
already there with the same size is skipped, and a different file under an existing key is saved beside
it under today's date. A failure only warns (`::warning::` in the run log); it never fails a run that
published. Fetch one back: `https://tiles.mapwich.org/raw/<path>` (list the folder in the Cloudflare R2
dashboard, prefix `raw/`). It is public domain source data, so the copies are publicly downloadable.
Local runs keep theirs in `data/cache/` already. About 0.1 to 1 GB per run, a cent or less a month.

**Not on GitHub yet:** anything needing GDAL or tippecanoe (geographies, tiles, features,
census2020, ddp287g, vmt, label-mask, mpo; `counts` for non-ACS sources); `timeline` for `fars` (it needs
`population_density`'s 2019 stop on disk); and anything that changes committed files (a new
dataset, level or timeline stop, insights). Those still run locally, through a PR (a local real
loss uses `ALLOW_TRACT_DROP=1`).

**One-time setup (Robbie):**

1. Cloudflare, R2, Manage API tokens, Create API token: permission **Object Read & Write**, applied
   to **the Mapwich bucket only**, no expiry (or a year, with a reminder). Copy the Access Key ID and
   Secret Access Key it shows once.
2. GitHub, the repo, Settings, Environments, New environment, name `data`. Under Deployment
   branches and tags choose **Selected branches and tags** and add `main`.
3. In that environment, Add environment secret, six times, pasting each value: `SUPABASE_DB_URL`,
   `CENSUS_API_KEY` (same as `.env.local`), `R2_ACCOUNT_ID`, `R2_BUCKET` (same as `.env.local`),
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (the new token from step 1). Don't add
   `ANTHROPIC_API_KEY`.
4. Try it on one small dataset you can check by eye, e.g. `places` + `stroke` (county only, no tract merge),
   then curl one of its files (section 6, "Re-upload the data files").

GitHub hides secret values in logs, but this repo is public, so run logs are too: don't paste a
secret into an input. If one ever shows in a log, rotate it (section 5).
