# Progress log

Every worker reads this first and updates it last. Keep it short: when a phase closes, trim its
rows into one summary line. Roadmap: `docs/roadmap.md`. Rules: `docs/handbook.md`.

## Now

- **Phase 1 (2026-10-12):** shipped 1.1 part 1 + 2a (compare places, laptop map), 1.2 (change maps with From → To, Map options panel), 1.3, 1.4, 1.5, 1.8, S1, S2. Left: 1.1 part 2b (counts and share of parent; counts are uploaded and live since 2026-10-12, D-257), 1.7 map polish (waits on Robbie's phone check), 1.6 disclosures (**on hold** by Robbie, 2026-10-09; nobody rewrites the copy). Then the Phase 1 gate: Robbie uses compare and change maps in a real conversation.
- **Robbie's list:** `~/webgis/drafts/robbie-this-week.md` (gitignored) holds every open ask for him, newest under "New items". Add to it rather than asking one question at a time.
- **Specials:** two drafts await Robbie in `drafts/specials/` (#105 traffic deaths, #141 Holmes County bikes), with numbers scripts beside them. On "publish <name>": copy verbatim, strip `<!-- -->` comments (the loader counts them as words), move the script to `apps/web/scripts/specials-numbers/`, then run `check:special` and the build.
- **Phase 2 started early (Robbie: "keep building"):** #115 "Why this matters" PR 1 (content gated by `approved`). Transit (2.4) review verdict CHANGE → #176, which waits on Robbie's four calls.
- **Repo is public (2026-10-10)** after GitHub Actions minutes ran out (#162). gitleaks was clean across the history; secret scanning and push protection are on. License is MIT (PR #190, D-290); #44 only needs branch protection (Robbie).
- **Ponytail (#151, PR #163):** coding workers self-review with `ponytail-review`; the lead runs it again before merging.
- **CI quirks:** a cancelled draft-stage run leaves a red `click-through ${{ matrix.shard }}/4`; `merge-pr.sh` ignores it. "The job was not started… spending limit" annotations mean billing, not code (#162). Occasional 502s from `tiles.mapwich.org` fail a shard; re-run failed jobs once before digging.
- **Tester agent trial** runs through 2026-10-19 (D-291).
- **Worker environment:** Chromium can't run in the agent sandbox, so e2e and screenshots happen only in CI on a *ready* PR.
- **Progress rows:** the lead adds Finished rows and Lessons at merge time from the worker's report.

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
| Dependency updates (Actions + minor/patch) | — | #124 | lead inline | ~15k | n/a | Opus / medium (lead) | 2026-10-07 |
| 1.8 Specials pipeline: brief, numbers check, parser tests | #125 | #128 | S / ~100k | 88k | 0.88x | Sonnet / medium | 2026-10-07 |
| Fix main build after TS 7 / eslint 10 | — | #135 | lead inline | ~15k | n/a | Opus (session) | 2026-10-08 |
| Data: CDC PLACES, 32 county maps | #114 | #136 | S, inline | ~40k | n/a | Opus (session) | 2026-10-08 |
| Data: ACS, 17 maps | #133 | #137 | S, inline | ~50k | n/a | Opus (session) | 2026-10-08 |
| Data: NOAA degree days + July lows | #133 | #140 | S, inline | ~25k | n/a | Opus (session) | 2026-10-08 |
| Data: overdose deaths | #41 | #134 | S–M / ~150k | 62k | 0.41x | Sonnet / medium | 2026-10-08 |
| Data: EPA PM2.5 + ozone | #6 | #138 | S–M / ~150k | 72k | 0.48x | Sonnet / medium | 2026-10-08 |
| Data: FEMA National Risk Index, 10 maps | #40 | #139 | M / ~275k | 165k | 0.60x | Opus / medium | 2026-10-08 |
| Data: DOE LEAD energy burden (incl. 200% FPL redo) | #42 | #142 | M / ~250k | 227k | 0.91x | Opus / medium | 2026-10-08 |
| Guard: tract uploads can't drop live datasets | #133 | #143 | lead inline | ~20k | n/a | Opus (session) | 2026-10-08 |
| Data wave 1 generated files | #133 | #144 | lead inline | ~10k | n/a | Opus (session) | 2026-10-08 |
| Fix: earlier years never request missing boundary files | #159 | #160 | S | n/r | n/a | Sonnet / medium | 2026-10-10 |
| PM2.5: El Paso note | #147 | #161 | lead inline | ~15k | n/a | Opus (session) | 2026-10-10 |
| 1.1 Compare places, part 1 | #117 | #158 | M / ~275k | n/r | n/a | Opus / medium | 2026-10-10 |
| 1.2 Change maps + Map options panel | #127, #155 | #152 | M / ~275k | ~107k (rework only) | n/a | Opus / medium | 2026-10-10 |
| Ponytail in the project rules | #151 | #163 | lead inline | ~20k | n/a | Opus (session) | 2026-10-11 |
| Share button | #164 | #166 | S / ~100k | ~114k | 1.1x | Opus / medium | 2026-10-12 |
| Year slider + From → To change maps | #165, #168 | #167 | S / ~100k | ~146k | 1.5x | Opus / medium | 2026-10-12 |
| 1.1 Compare places, part 2a (laptop map) | #117 | #170 | M / ~250k | ~199k | 0.8x | Opus / medium | 2026-10-12 |
| e2e: map handle survives reloads | #153 | #175 | S / ~100k | ~64k | 0.64x | Sonnet / medium | 2026-10-12 |

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

- **#124:** stale Dependabot branches conflict with newer workflow edits; re-applying the version bumps on a fresh branch and running CI once beats rebasing five PRs. `braces` (alert #1) still has no patched version.
- **1.8:** the Specials loader reads every `.md` in `content/specials/`, so non-piece docs there (BRIEF.md) must be excluded in the loader. Node's type-stripping rejects constructor parameter properties in scripts run directly.
- **1.3 (in review):** MapView's map `error` listener swallowed a layer validation error (`["==", 1, 0]` is read as a legacy filter), so the hatch layer silently never existed; unit tests passed because they replaced the filter. Validate every new layer with the style spec exactly as created. The CI click-through was the first real browser check and caught it.
- **1.6 (in review):** `.vercelignore` drops `.claude`, so build-time reads of agent files got nothing on Vercel; type generated JSON explicitly so an empty list still compiles.
- **Data wave 1 (#133):** registry-only batches (an existing ingest, YAML from a small generator script) are the cheapest data there is: 52 maps for about 115k tokens inline. New-kind sources cost 60–230k each with a worker.
- **Data wave 1, incident:** tract values live in per-county files that hold every dataset, so a load from a checkout without them uploads files that erase the rest. Check `data/tiles` is complete before any `publish-data`; #143 now refuses such uploads. `export` also rebuilds `periods.json` from local files, so diff it before committing.
- **Data wave 1, merging:** seven PRs that each append to `schema.ts`, `run.ts` and `format.ts` conflict with each other every time. Merge them once in a combined local worktree to load, then merge the PRs one at a time with a scripted "merge main, regenerate registry, push" step.
- **Census API:** it now requires a key (`missing_key.html` redirect). To check which tables exist at block-group level without one, sample the table-based summary files on www2.census.gov for `1500000US` rows.
- **Shell:** `pkill -f <pattern>` matches the calling shell's own command line and kills it (exit 144). Use the PID from `pgrep`.
- **#162:** a private repo's free Actions minutes ran out mid-session; the failure looked like a 3 s "click-through" fail with an empty log. Read the job's annotations (`gh api …/check-runs/<id>/annotations`) before debugging tests.
- **#170:** test IDs copied from unit fixtures may not exist in live data; pick e2e places from the live geo files.
- **#167:** native range inputs lose the pointer when a mouse drags off them; commit-on-release needs `setPointerCapture`.
- **Specials drafts:** run `check:special` on a `git archive` of `origin/main` (node_modules symlinked) to check a draft without a branch.

## How to update

- Workers: read this first; put your token estimate and one lesson in your final report. Don't edit this file.
- The lead adds the Finished row and Lessons line at merge, and moves **Now** forward.
- Ratio = actual / budget. Under 1.0 is good; over 1.5 means stop and report.
