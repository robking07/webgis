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
| Supabase (Postgres + PostGIS) | State and county click details, place pages, Odd Pairing approvals, reviewer sign-in | supabase.com/dashboard | 500 MB database; pauses after about a week idle (the keepalive cron prevents it) | Map still draws from static JSON and tiles; detail panels, place pages and reviewer login fail |
| Cloudflare R2 (bucket `webgis`, domain `tiles.mapwich.org`) | Boundary and feature PMTiles, range requests from browsers | dash.cloudflare.com, R2 | 10 GB stored, no egress fees; spend notification set | Map has no boundaries (blank choropleth) |
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
Settings, Environment Variables, **GH** = repo Settings, Secrets and variables, Actions.
After rotating anything in Vercel, redeploy (values are read at build or start).

| Name | Lives in | Rotate |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design) | local, Vercel, GH | Supabase, Project Settings, API keys; update all three places, redeploy |
| `SUPABASE_DB_URL` (session-pooler string with the DB password) | local only | Supabase, Project Settings, Database, reset password; update the string |
| `NEXT_PUBLIC_TILES_BASE_URL` (public: `https://tiles.mapwich.org`; also set in `ci.yml`) | local, Vercel | Not a secret; change only if the tile domain moves |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | local only | Cloudflare, R2, Manage API tokens: create a new token, update `.env.local`, delete the old one |
| `CRON_SECRET` | Vercel (Vercel sends it on cron calls) | Set a new random value in Vercel and redeploy |
| `NEXT_PUBLIC_SENTRY_DSN` (public, ships to browsers) | Vercel, local | Sentry, Project Settings, Client Keys; rotating is rarely needed |
| `CENSUS_API_KEY` | local only | Request a new key from the Census signup page |
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
   `ingest -- export` and `ingest -- insights`. Needs `SUPABASE_DB_URL`, `CENSUS_API_KEY`
   (optional `ANTHROPIC_API_KEY`), and GDAL for feature layers. The exported JSON is committed, so the
   live site renders without this step; the database does not.
5. **Tiles:** `ingest -- tiles [state|county|tract]`, `ingest -- features <id>`, then
   `ingest -- publish-tiles` to the R2 bucket (sets CORS). Needs `tippecanoe`, `ogr2ogr` and the four
   `R2_*` names. `data/tiles/` is git-ignored and empty in a fresh clone, so tiles must be rebuilt.
   Bind `tiles.mapwich.org` to the bucket as an R2 custom domain.
6. Sentry: the handbook section 7 checklist.

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
| `build-tiles` skill and `publish-tiles.ts` still describe the r2.dev URL; the custom domain `tiles.mapwich.org` appears only in DECISIONS Q-2 | Follow-up (check CORS origins and update the skill) |
| Vercel project settings (Root Directory, framework) and the Supabase project ref are written nowhere in the repo | Follow-up for Robbie: read them from the dashboards once and add to section 6 |
| No backup or restore path for Supabase (free tier has none); restoring means re-running every ingest step | Follow-up (decide whether a periodic `pg_dump` is worth it) |
| Whether `ingest -- all` covers every registry dataset was not checked | Follow-up |
| No `.env.example`; a names-only template would make setup safer | Follow-up (small PR) |
| Handbook section 7 had no pointer to this runbook | Fixed |
