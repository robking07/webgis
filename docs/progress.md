# Progress log

Every worker reads this first and updates it last. Keep it short: when a phase closes, trim its
rows into one summary line. Roadmap: `docs/roadmap.md`. Rules: `docs/handbook.md`.

## Now

- **Phase:** 0 · Foundations.
- **Wave 2 (running in parallel):** F7 prune CLAUDE.md (#54), F8 progress log (#55), G2 dependency
  alerts (#51). That is three workers, one over the roadmap's two-worker limit, on Robbie's say-so
  (2026-10-05, "spin up as much work as you can").
- **Next:** F6 agent roles once F7 + F8 merge. Then wave 3: F2 (CI checks) + 1.5, then S3.
  Then F3 + 1.4 and the Phase 0 gate (F11 project kit, #53, lands there).

## Finished

| Task | Issue | PR | Size / budget | Actual tokens | Ratio | Model / effort | Date |
|---|---|---|---|---|---|---|---|
| G1 agent guardrails | #46 | #47 | S / ~100k | 163k | 1.6x | Sonnet / medium | 2026-10-05 |
| F1 handbook + architecture map | #48 | #50 | S / ~100k | 78k | 0.78x | Sonnet / medium | 2026-10-05 |
| F4 screenshot + review-page tools | #49 | #52 | S / ~100k | 78k | 0.78x | Sonnet / medium | 2026-10-05 |
| F8 progress log | #55 | #56 | S / ~100k | 55k | 0.55x | Sonnet / medium | 2026-10-05 |
| F7 trim CLAUDE.md | #54 | #58 | S / ~100k | 62k | 0.62x | Sonnet / medium | 2026-10-05 |

## Lessons

One line per task. These feed the project kit (#53).

- **G1:** overran (1.6x) because its testing scope was open-ended. Say exactly what to test and
  where to stop.
- **F1, F4:** briefs set a tight testing scope and both came in under budget (0.78x).
- **Merge script:** `scripts/merge-pr.sh` can fail on its first run (a missing local commit, or a
  GitHub 502 "merge in progress"). Run `git fetch` and retry before assuming something is wrong.
- **F8:** a log only helps if workers actually update it, so the handbook now makes it part of
  setup (read first) and reporting (update last). A fresh worktree has no `node_modules`, so
  docs-only briefs should skip `npm run build` (CI and the Vercel preview build it anyway).
- **F7:** CLAUDE.md went from 55 to 39 lines; it now points to docs instead of repeating them.
  Deleting files means checking lock/manifest files too (`skills-lock.json`).

## How to update

- In your own PR, add a row to **Finished** and one line to **Lessons**.
- If you can't know your final token count, write "tbd" and the lead fills it in at merge.
- Move **Now** forward only if your task changes it (the lead normally does this).
- Ratio = actual / budget. Under 1.0 is good; over 1.5 means you should have stopped and reported.
