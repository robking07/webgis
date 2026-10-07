# Progress log

Every worker reads this first and updates it last. Keep it short: when a phase closes, trim its
rows into one summary line. Roadmap: `docs/roadmap.md`. Rules: `docs/handbook.md`.

## Now

- **Phase 0 gate: passed with conditions** (review lead, 2026-10-05). Conditions: Robbie's Sentry/Cloudflare setup (#76); fix drifted skills (#89) before any data-engineer task.
- **Phase 1 order (lead, after review):** S1 static click details + unit-test runner → S2 data files to R2 → 1.3 + 1.1 → 1.2 → 1.6, 1.8, 1.7. S1 and 1.1 touch the same files, so they run in sequence.
- **Data pause: ended 2026-10-06.** S2 (#110) merged: the map's data files now live on R2 (`tiles.mapwich.org`), not in `apps/web/public/data`. Data refreshes are `npm run ingest -- publish-data` (Robbie runs uploads; keys are his, #107), not a code deploy.
- **Next:** 1.3 reliability warnings (#97) building; 1.1 compare places (#117) parked until Robbie reopens it.
- **Progress rows:** the lead adds Finished rows and Lessons at merge time from the worker's report (workers no longer edit this file; it conflicted on almost every merge).

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
| 1.4 CSV download | #78 | #79 | S / ~100k | 59k | 0.59x | Sonnet / medium | 2026-10-05 |
| Logo redo | #81 | #82 | S / ~60k | 39k | 0.65x | Sonnet / low | 2026-10-05 |
| F3 lint cleanup + blocking | #83, #80 | #84 | S / ~100k | 53k | 0.53x | Sonnet / medium | 2026-10-05 |
| G3 runbook + rebuild drill | #85 | #87 | S / ~100k | 95k | 0.95x | Sonnet / medium | 2026-10-05 |
| F9 prototype audit + F10 changelog | #86 | #88 | S / ~100k | 97k + 40k review | 1.37x | Opus / low | 2026-10-05 |
| Skill drift + README + .env.example | #89 | #91 | S / ~50k | 66k | 1.3x | Sonnet / medium | 2026-10-05 |
| Splash page, map at /map, noindex | #92 | #93 | S / ~100k | 74k | 0.74x | Sonnet / medium | 2026-10-05 |
| S2 data files to R2 | #96, #106 | #110 | M / ~275k | not recorded | n/a | Opus / medium | 2026-10-06 |

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
- **1.4:** the sandbox has no Chromium system libs (libnspr4), so `npm run shots` and e2e cannot run here; check that early and run the real CSV function from a node script instead. Excel treats leading `#` lines as data, so notes go after the rows.
- **Decision files:** two workers (#65, #75) wrote `# D-1xx: Title`; the check wants `# D-1xx · Title`. Briefs now give the exact first line; run `PR_NUMBER=<n> node scripts/check-decisions.mjs` before pushing.
- **F2:** the e2e suite passes locally but one fade check flaked on the slower CI runner; wait
  for the state you assert (CSS transitions done), not a fixed delay. Heavy checks (~10 of a
  run's ~14 min) now run only on ready PRs; mark the PR ready before merging. A PR that
  conflicts with main gets no CI run at all, so check mergeability when CI seems silent.
- **F3:** React 19's lint rules want state adjusted during render (a stored previous value) instead of `setState` in an effect, and refs written in a layout effect instead of during render; behavior stays the same. `npx tsc` alone fails on missing `PageProps` types until `next build` generates them.

- **G3:** a no-key fresh clone builds and serves in under a minute, so the real rebuild risk is the data side (empty git-ignored `data/tiles/`, the database, unwritten Vercel/Supabase settings). Skills had drifted (push to main, old vercel.app origin); a drill is the cheapest way to find that.
- **#81:** a cut-out in a one-color mark is safest as an SVG mask (shows the real background on panels); satori (share cards) gets a plain bg-colored stroke instead.
- **F9:** an audit is cheap when every verdict rests on a command (`wc -l`, `git ls-files`, a grep for `supabase`); the code beat the prior view on two points (search index, place pages hitting the database per view).
- **Progress log:** every worker adding its own row makes `docs/progress.md` conflict on almost every merge. Consider letting the lead add rows at merge time instead.
- **#89:** `.env.*` in `.gitignore` silently swallowed `.env.example`; check `git check-ignore` before adding a dotfile.
- **Gate review:** a fresh-context review lead (40k) caught a wrong claim and a phase-ordering flaw the builders missed; worth it at every gate.
- **#92:** the e2e runner reuses whatever server holds its port; an orphan server from the rebuild drill caused 26 false failures. Stop every server you start.
- **S2:** a data move needs the upload before the merge: CI click-through and the Vercel preview read the live R2 files, so the PR stayed draft until Robbie ran `publish-data` and the lead curl-checked objects (200s). Fixed keys plus a one-hour cache beat versioned paths, because a version in the path would need a code deploy again (D-210).

## How to update

- Workers: read this first; put your token estimate and one lesson in your final report. Don't edit this file.
- The lead adds the Finished row and Lessons line at merge, and moves **Now** forward.
- Ratio = actual / budget. Under 1.0 is good; over 1.5 means stop and report.
