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
  There is no `.env.example` in the repo, so these are the names the code reads (names only):
  - Site: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TILES_BASE_URL`, `CRON_SECRET`
  - Ingest (Robbie's machine only): `SUPABASE_DB_URL`, `CENSUS_API_KEY`, `ANTHROPIC_API_KEY`,
    `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
  - If a task needs a key you don't have, stop and say so in your report. Don't hunt for it.
- Docs-only work needs no install.

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
   - rough token use against your budget. Stop and report at 1.5x the budget.

## 5. Merging

Workers never merge. The lead merges, only with `bash scripts/merge-pr.sh <n>` (it refuses if the
branch is behind `main` or a check is red), then removes the worktree and local branch.
