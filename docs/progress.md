# Progress log

Every worker reads this first and updates it last. Keep it short: when a phase closes, trim its
rows into one summary line. Roadmap: `docs/roadmap.md`. Rules: `docs/handbook.md`.

## Now

- **Phase:** 0 · Foundations.
- **Wave 2 done** (F7, F8, G2, F6 all merged 2026-10-05, all under budget). Ran three workers at
  once on Robbie's say-so ("spin up as much work as you can"), one over the roadmap's limit.
- **Wave 3 running:** F2 CI checks (#61, M, Opus) and 1.5 link previews (#37, S, Sonnet).
- **Next:** S3 (cost alerts, uptime email, browser error reporting), then F3 + 1.4 and the Phase 0
  gate (F11 project kit, #53, lands there).

## Finished

| Task | Issue | PR | Size / budget | Actual tokens | Ratio | Model / effort | Date |
|---|---|---|---|---|---|---|---|
| G1 agent guardrails | #46 | #47 | S / ~100k | 163k | 1.6x | Sonnet / medium | 2026-10-05 |
| F1 handbook + architecture map | #48 | #50 | S / ~100k | 78k | 0.78x | Sonnet / medium | 2026-10-05 |
| F4 screenshot + review-page tools | #49 | #52 | S / ~100k | 78k | 0.78x | Sonnet / medium | 2026-10-05 |
| F8 progress log | #55 | #56 | S / ~100k | 55k | 0.55x | Sonnet / medium | 2026-10-05 |
| F7 trim CLAUDE.md | #54 | #58 | S / ~100k | 62k | 0.62x | Sonnet / medium | 2026-10-05 |
| G2 dependency alerts | #51 | #57 | S / ~100k | 55k | 0.55x | Sonnet / medium | 2026-10-05 |
| F6 agent roles | #59 | #60 | S / ~100k | 70k | 0.70x | Sonnet / medium | 2026-10-05 |
| 1.5 link previews | #37 | #65 | S / ~100k | 116k | 1.16x | Sonnet / medium | 2026-10-05 |
| Share-card font | #72 | #74 | S / ~50k | 40k | 0.8x | Sonnet / medium | 2026-10-05 |
| S3 alerts | #73 | #75 | S / ~100k | 81k | 0.81x | Sonnet / medium | 2026-10-05 |
| F2 checks in GitHub CI | #61 | #68 | M / ~275k | 230k | 0.84x | Opus / medium | 2026-10-05 |

## Lessons

One line per task. These feed the project kit (#53).

- **G1:** overran (1.6x) because its testing scope was open-ended. Say exactly what to test and
  where to stop.
- **1.5:** route handlers under `/og/*` beat file-based opengraph-image here: a Special's own thumbnail and a generated card can share one `shareMeta` helper, and one card function serves every page. Went 1.16x chasing a font-measuring quirk in generated images; a bundled font is the real fix (follow-up).
- **#72:** satori reads woff/ttf but not woff2, and `fetch(new URL(..., import.meta.url))` fails at build prerender; `fs.readFile` from `process.cwd()` works. `@fontsource/*` tarballs (via `npm pack`) are an easy source of static OFL woff files. Files read with fs at request time need `outputFileTracingIncludes` or they may be missing on Vercel.
- **S3:** Next leaves an unset `NEXT_PUBLIC_*` var as a runtime lookup, so an `if (dsn)` guard alone doesn't drop the SDK from the bundle (+181 KB gzip); inline `""` via `env` in `next.config.ts`. `@sentry/nextjs` v11 has no `sendDefaultPii` (use `dataCollection`).
- **F1, F4:** briefs set a tight testing scope and both came in under budget (0.78x).
- **Merge script:** `scripts/merge-pr.sh` can fail on its first run (a missing local commit, or a
  GitHub 502 "merge in progress"). Run `git fetch` and retry before assuming something is wrong.
- **F8:** a log only helps if workers actually update it, so the handbook now makes it part of
  setup (read first) and reporting (update last). A fresh worktree has no `node_modules`, so
  docs-only briefs should skip `npm run build` (CI and the Vercel preview build it anyway).
- **F7:** CLAUDE.md went from 55 to 39 lines; it now points to docs instead of repeating them.
  Deleting files means checking lock/manifest files too (`skills-lock.json`).
- **G2:** an alert can have no patched version (braces 3.0.3). Check `first_patched_version` and
  `npm view <pkg> versions` before trying a bump or override.
- **F6:** Claude Code agent frontmatter supports `model` and `effort`, so routing lives in the agent files, not prose. The lead's brief can still override the model per task (opus for M/L).
- **Decision files:** two workers (#65, #75) wrote `# D-1xx: Title`; the check wants `# D-1xx · Title`. Briefs now give the exact first line; run `PR_NUMBER=<n> node scripts/check-decisions.mjs` before pushing.
- **F2:** the e2e suite passes locally but one fade check flaked on the slower CI runner; wait
  for the state you assert (CSS transitions done), not a fixed delay. Heavy checks (~10 of a
  run's ~14 min) now run only on ready PRs; mark the PR ready before merging. A PR that
  conflicts with main gets no CI run at all, so check mergeability when CI seems silent.

## How to update

- In your own PR, add a row to **Finished** and one line to **Lessons**.
- If you can't know your final token count, write "tbd" and the lead fills it in at merge.
- Move **Now** forward only if your task changes it (the lead normally does this).
- Ratio = actual / budget. Under 1.0 is good; over 1.5 means you should have stopped and reported.
