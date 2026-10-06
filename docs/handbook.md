# Worker handbook

Read this first. It is the short version of how work on Mapwich (repo `webgis`) is done.
Your brief from the project lead (`claude --agent lead`) names the GitHub issue and anything
specific to it; everything general is here. Where things live: `docs/architecture.md`.
Full build spec: `docs/SPEC.md`. Project rules: `CLAUDE.md`.

## 1. Setup

- **Node 24** (`.nvmrc`; `package.json` says `>=24`).
- In your worktree, run `npm ci` (npm workspaces: `apps/web`, `packages/design`, `data/registry`, `data/ingest`).
  If a merged PR added a dependency and the build says a module is missing, run `npm ci` again.
- **Secrets** live in `.env.local` at the repo root. It is git-ignored. **Never open, print or
  commit it, and never pass a secret on a command line.** The guardrails hook blocks reading it.
  `.env.example` lists these names (names only, empty values):
  - Site: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TILES_BASE_URL`, `CRON_SECRET`
  - Ingest (Robbie's machine only): `SUPABASE_DB_URL`, `CENSUS_API_KEY`, `ANTHROPIC_API_KEY`,
    `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
  - If a task needs a key you don't have, stop and say so in your report. Don't hunt for it.
- Docs-only work needs no install.
- With no `.env.local`, `npm run build` and `npm run start -w web` still work (16 s build): Supabase
  detail values come back empty, `/api/keepalive` returns 500, and the map reads tiles from
  `/tiles/<level>.pmtiles`, which is empty because `data/tiles/` is git-ignored. Set
  `NEXT_PUBLIC_TILES_BASE_URL=https://tiles.mapwich.org` to see boundaries.
- Ingest also needs `ogr2ogr` (GDAL) and `tippecanoe` on the PATH (the `build-tiles` skill says how they
  are installed on Robbie's machine). Check with `ogr2ogr --version` and `tippecanoe --version`.
- Read `docs/progress.md` first (where things stand, lessons from earlier tasks).

## 2. House rules

Each rule links to its source; follow the source, not this summary.

- **Worktree and branch.** One task, one worktree under `.claude/worktrees/`, on a new branch from the
  latest `origin/main`. Never commit to `main`, never edit the main checkout, never stack on an
  unmerged branch. Name branches `data/<id>`, `ui/<topic>`, `fix/<topic>`, `perf/<topic>`,
  `chore/<topic>` or `notes/<topic>`. One task per PR. See `docs/branching.md`.
- **Draft PR early.** Open it as a draft right after the first commit.
- **Decision IDs = PR number + 100.** PR #12 is D-112, in its own file
  `docs/decisions/D-112-<slug>.md`. Never pick "the next number" from the log. `docs/DECISIONS.md`
  (D-01 to D-99) is frozen. Write a decision file only when you made a real choice worth recording.
- **Before pushing:** `git fetch origin && git merge origin/main`, re-run the checks, push.
  CI (`.github/workflows/pr-checks.yml`) fails a branch that is behind `main` or has a bad decision ID.
- **Symbology only from `packages/design` tokens** (ramps, sizing, themes, `style.ts`). No ad hoc
  colors or layer styling in `apps/web`. Reference: `docs/design-system.md`.
- **Datasets only through the registry.** A new or changed dataset = a YAML entry in
  `data/registry/datasets/` + an ingest script in `data/ingest/src/`. No UI code. Use the
  `add-dataset` skill; the licence screen and approval flow are in `docs/data-intake.md`.
- **Never touch** Robbie's NAS, his home network, or Met Council internal systems or non-public
  data. Data the Met Council publishes openly (e.g. MN Geospatial Commons) is allowed, with the
  usual licence check (D-16).
- **Non-commercial, map-first.** The map stays clean and authoritative; options appear as the user
  digs in. Robbie writes the editorial copy; agent-written Specials stay draft with an honest byline.
- **Guardrails hook** (`.claude/hooks/guardrails.mjs`, wired in `.claude/settings.json`). It blocks
  pushes to `main`, force pushes, `--no-verify`, direct PR merges and reading `.env.local`. If it
  blocks you, take the safe route it names; don't look for a way around. Its test: `npm run test:guardrails`.
- **Stay in scope.** Do what the issue asks. Extras are how budgets get blown. Note them in your
  report instead.

## 3. Checks: what to run, and when

Run from your worktree root unless noted.

| Command | What it does | When |
| --- | --- | --- |
| `npm run build` | Runs `check:design`, then `next build` for `apps/web` (its `prebuild` regenerates theme CSS and assets). | Any change under `apps/web`, `packages/design` or `data/registry`. Always before a PR that touches code. |
| `npm run check:design` | Colorblind and contrast gate for the design tokens (`packages/design/scripts/check.ts`). | Any change to `packages/design` (also part of `build`). |
| `npm run registry:validate` | Validates every `data/registry/datasets/*.yaml` against `schema.ts`. | Any dataset or registry change. |
| `npm run lint -w web` | ESLint for `apps/web`. | Any change under `apps/web`. |
| `npm run test:e2e -w web` | Playwright (Chromium) menu and map behavior tests at phone, laptop and monitor sizes. Needs a prior `npm run build`; takes about 5 minutes. Options in `apps/web/e2e/README.md`. | UI changes to menus, panels, the map page or on-map chrome. |
| `npm run test:guardrails` | Tests the guardrails hook. | Only if you change `.claude/hooks/guardrails.mjs` or the deny rules. |
| `node scripts/check-decisions.mjs` | The decision-number check CI runs. | If you add or rename a decision file (CI also runs it). |

CI runs these on every PR (`.github/workflows/ci.yml`, D-168); `scripts/merge-pr.sh` won't
merge while one is red. Docs-only PRs (only `docs/`, `.claude/` or top-level `*.md`) skip the
ones marked *, which counts as passing. Checks marked † run on ready PRs only, not drafts: the
lead runs `gh pr ready <n>` before merging, and `merge-pr.sh` refuses a code PR until they pass.

| CI check | What it covers | Blocking? |
| --- | --- | --- |
| `branch-rules` | Branch includes the latest `main`; decision numbers match the PR. | Yes |
| `build` * | `npm ci` + `npm run build` (design check + `next build`). | Yes |
| `lint` * | `npm run lint -w web`; any ESLint error fails the job. | Yes |
| `click-through` * † | `npm run test:e2e -w web` on the CI build (about 10 min). Runs on ready PRs only. | Yes |
| `secret scan` | gitleaks over the PR's commits. | Yes |
| `speed + accessibility` * † | Lighthouse on `/`, a dataset page and a Special (local build). Runs on ready PRs only. | Accessibility < 90 fails; performance, best practices, SEO only warn |

Skills to use (invoke by name):

- `run`: launch the app and see a change working in the real browser. Use for any visible
  change; for a UI proposal, attach real screenshots at true scale (today vs. your version).
- `dataset-display-review`: after adding or changing a dataset, check it reads well to a regular
  person (no cryptic codes, raw units, missing explainers, facets). Part of the dataset flow.
- `add-dataset`, `build-tiles` (PMTiles to R2), `postgis-analysis` (SQL and migrations),
  `maplibre-*` (map rendering questions): use the one that matches the task.

Docs-only PRs need no build; check that every path and command you cite exists.
Ingest steps (`npm run ingest -- <step>`) and `npm run db:migrate` need GDAL, tippecanoe and
Robbie's keys. Don't run them unless the brief says so.

## 4. Reporting back to the lead

You are a worker, not the decision maker. Don't ask Robbie anything; don't merge.

1. Push your branch and open a **draft PR** whose body contains `Closes #N`. End commits with the
   attribution lines from your brief. (`gh pr edit` fails on this repo; use
   `gh api -X PATCH repos/robking07/webgis/pulls/N -f body=...`.)
2. Your final message to the lead contains:
   - the PR number and link, and the files you changed;
   - **the check output, pasted** (not "tests pass"): the commands you ran and their results;
   - **Questions for Robbie**, listed with the options you see and the default you took. Choices
     that are his: what users see, scope, editorial wording, data judgment, cost;
   - anything odd you found in the repo (listed, not fixed);
   - rough token use against your budget. Stop and report at 1.5x the budget;
   - your token estimate and a one-line lesson in the report; the lead adds them to `docs/progress.md` at merge (don't edit it yourself).

## 5. Merging

Workers never merge. The lead merges, only with `bash scripts/merge-pr.sh <n>` (it refuses if the
branch is behind `main` or a check is red), then removes the worktree and local branch.

## 6. Dependency alerts and Dependabot PRs

Dependabot (`.github/dependabot.yml`) opens a few grouped PRs each week for npm and GitHub Actions,
and GitHub raises security alerts separately.

- The lead reviews a Dependabot PR like any worker PR: checks must be green, then merge with
  `bash scripts/merge-pr.sh <n>`.
- Triage an alert by where the package runs. One that ships to browsers or runs on the server
  (`npm ls <pkg>` shows it under a runtime dependency) comes first. A build-time-only one (dev tools,
  `shadcn`, bundlers) is lower priority.
- Fix by updating the parent package; use a root `overrides` entry only if no parent release fixes it.
- If no patched version exists, don't dismiss the alert yourself; report it. The lead decides: a
  build-time-only alert stays open (Dependabot opens the fix PR once a patch ships); a runtime one
  gets a workaround or a written dismissal reason.

## 7. Alerts: where they go

What to do when something breaks (rollback, services, secrets, rebuild): `docs/runbook.md`.

| What | Watched by | Alert goes to |
| --- | --- | --- |
| Browser errors visitors hit | Sentry (free Developer plan), client side only | Robbie's email (Sentry default issue alerts); the lead reads the issue list |
| mapwich.org not loading | Sentry Uptime Monitoring (1 monitor is included free on every plan; checks about every minute, an issue opens after 3 failures from different regions) | Robbie's email |
| Cloudflare R2 bill (tiles) | Cloudflare spend notification | Robbie's email |
| Vercel Hobby, Supabase free | Nothing to set: both stop at their hard limits and can't bill | n/a |

Error reporting is off until `NEXT_PUBLIC_SENTRY_DSN` is set; with it unset (CI, local dev) the code
does nothing and no Sentry code ships to browsers. It is errors only: no session replay, no
performance tracing, no user context, no cookies, headers or query strings. Source maps are not
uploaded, so stack traces show minified code; uploading them later needs a Sentry auth token
secret. There is deliberately no scheduled GitHub Action for uptime: the repo is private and a
15-minute check would use about 2,900 of the 2,000 free Actions minutes a month.

### Robbie's setup checklist

1. Create a free Sentry account (sentry.io) and a Next.js project named `mapwich`.
2. Put the project's DSN in Vercel as `NEXT_PUBLIC_SENTRY_DSN` (Production and Preview) and in
   `.env.local`. Redeploy; the value is read at build time.
3. Sentry project settings, Security and Privacy: turn on **Prevent Storing of IP Addresses**.
4. Sentry, Alerts: confirm an issue alert emails you on new issues.
5. Sentry, Uptime Monitors: add one monitor for `https://mapwich.org` with email alerts to you.
6. Cloudflare dashboard, Billing: set a spend notification for R2 (for example $5).
