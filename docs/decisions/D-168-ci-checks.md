# D-168 - Checks in GitHub CI

- Date: 2026-10-05. Decided by: worker on roadmap task F2 (issue #61), defaults from the lead's
  brief. PR #68.

2026-10-05: lint now blocking (F3, #83).

## Decision

Every PR to `main` runs `.github/workflows/ci.yml` beside the existing `branch-rules` job.
`scripts/merge-pr.sh` waits for all checks and refuses to merge if any fails, so these are
the merge gate. The table of checks is in `docs/handbook.md` §3.

- **build:** `npm ci` + `npm run build` (includes `check:design`). Needs no secrets: the
  tiles URL is public and hard-coded in the workflow; Supabase is read from optional repo
  secrets and the app builds without it (county/state detail values are then empty). The
  production build is packed as an artifact so click-through and Lighthouse don't rebuild.
- **lint (report-only):** ESLint for `apps/web`. A failure only adds a warning with the
  problem count (16 at the start: 15 errors, 1 warning). Roadmap task F3 clears them and
  then removes the fallback so lint blocks.
- **click-through:** `npm run test:e2e -w web` against `next start` on the CI build, with
  Playwright's Chromium. About 10 minutes on a GitHub runner (software WebGL).
- **secret scan:** gitleaks CLI (v8.30.1, downloaded from its GitHub release; no action, so
  no license key question) over the PR's commits (`base..head`), output redacted. No
  `.gitleaks.toml`: the tree has no false positives. Allowlist only proven false positives.
- **speed + accessibility:** Lighthouse CI (`npx @lhci/cli@0.15.1`, no new dependency) on a
  **local production server**, not the Vercel preview: previews sit behind Vercel login,
  and a local run needs no bypass secret and doesn't wait on Vercel. Pages: `/`,
  `/data/median_household_income`, `/specials/work-from-home-and-exercise`; one run each,
  mobile emulation. Accessibility < 0.9 fails. Performance, best practices and SEO < 0.9
  only warn. Reports are kept as a 7-day artifact; scores go to the job summary.

## Heavy checks run on ready PRs only

Click-through and speed + accessibility (most of a run's minutes) skip draft PRs. Workers
push to drafts many times; the lead marks the PR ready (`gh pr ready <n>`) just before
merging, and the `ready_for_review` event runs them. Build, lint, secret scan and "what
changed" run on every push, drafts included. Because skipped counts as passing,
`scripts/merge-pr.sh` also refuses a code PR (`build` passed, not skipped) unless
click-through and speed + accessibility both passed; docs-only PRs (build skipped) merge as
before. (Lead's review of PR #68.)

## Baseline (PR #68, first run)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 46 | 100 | 93 | 100 |
| `/data/median_household_income` | 97 | 96 | 96 | 100 |
| `/specials/work-from-home-and-exercise` | 63 | 100 | 96 | 100 |

The map page's score is low partly because CI renders WebGL in software, and tiles from
`tiles.mapwich.org` are refused on `localhost` (CORS). Performance turns blocking only by a
later decision, once there is a target the map page can meet.

## CI minutes

Free private-repo budget is about 2,000 minutes a month. A full run costs about 15 runner
minutes (click-through is most of it); a draft push costs about 3. To keep it modest: heavy
checks wait for the ready PR (above); a newer push cancels the run it supersedes; docs-only PRs (only `docs/`, `.claude/` or top-level `*.md` changed) skip build,
lint, click-through and Lighthouse; those show as "skipping", which `gh pr checks` (and so
`merge-pr.sh`) treats as passing. The secret scan always runs. Actions are pinned to major
versions.
