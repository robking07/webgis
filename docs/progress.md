# Progress log

Every worker reads this first and updates it last. Keep it short: when a phase closes, trim its
rows into one summary line. Roadmap: `docs/roadmap.md`. Rules: `docs/handbook.md`.

## Now

- **Phase 0 gate: passed with conditions** (review lead, 2026-10-05). Conditions: Robbie's Sentry/Cloudflare setup (#76); fix drifted skills (#89) before any data-engineer task.
- **Phase 1 order (lead, after review):** S1 static click details + unit-test runner → S2 data files to R2 → 1.3 + 1.1 → 1.2 → 1.6, 1.8, 1.7. S1 and 1.1 touch the same files, so they run in sequence.
- **Data pause: ended 2026-10-06.** S2 (#110) merged: the map's data files now live on R2 (`tiles.mapwich.org`), not in `apps/web/public/data`. Data refreshes are `npm run ingest -- publish-data` (Robbie runs uploads; keys are his, #107), not a code deploy.
- **Data expansion (#133), 2026-10-08:** waves 1 and 2 are live: 68 new maps (60 → 128 datasets) from CDC PLACES, ACS, NOAA, CDC overdose, EPA air quality, FEMA NRI and DOE LEAD. Wave 3 is next (CDC SVI, PLACES tracts, Drought Monitor, USDA food access, BLS LAUS, FCC broadband). File each as its own issue first.
- **Incident, 2026-10-08 (fixed):** a load from an incomplete `data/tiles` wiped live tract details for existing datasets for about 9 h. Restored the same day; #143 guards `publish-data`. Until #146 is done, the complete local `data/tiles` is in `.claude/worktrees/trial-merge`.
- **Waiting on Robbie (2026-10-08):** #145 delete the keys copy in trial-merge; #146 make the main checkout's `data/tiles` complete; #147 check El Paso's PM2.5 jump.
- **Waiting on Robbie (2026-10-07):**
  - **1.6 disclosures page, PR #126:** all CI green. Robbie edits the wording (preview: webgis-git-ui-disclosures-king-llc.vercel.app/disclosures). Defaults taken: footer link "How it's built", footer only, drop the "Draft wording" badge at merge.
  - **1.2 change-over-time maps (#127):** filed, queued. It starts after #122 merges (same files: MapLegend, map page). Two questions for Robbie are on the issue (how change is measured; whether to show changes within the margin of error as "no clear change"). M, Opus / medium.
  - #76 (Sentry, uptime email, R2 spend alert) is still open.
- **After those:** 1.7 map polish (needs Robbie measuring on a real phone first), then the Phase 1 gate. The gate needs compare places (1.1, #117), which is parked until Robbie reopens it, so raise it before the gate.
- **Open worktrees:** `agent-adb8949…` = #122 and `agent-a38ac5e…` = #126. Remove each after its merge. `agent-adb896…` (preventable-harm mockup, PR #113 closed) and `ui-skills` (`chore/ui-skills`, no PR) are stale; ask before deleting.
- **Dependabot:** #66, #67, #69, #70 merged 2026-10-08. TypeScript 7 and eslint 10 broke the build; #135 fixed it. eslint 10 now prints about 1,125 warnings from bundled `public/maplibre/*.mjs` (0 errors). Alert #1 (`braces`) still has no patched version.
- **Cloud credits (Robbie, 2026-10-06):** about $99 set aside for heavy lifts; about 450k worker tokens used on 2026-10-07. Spend the rest on 1.2, then 1.1 when reopened.
- **Worker environment:** Chromium can't run in the agent sandbox (no libnspr4), so e2e and screenshots happen only in CI on a *ready* PR. Mark worker PRs ready once the build passes, so the click-through tests act as the first browser check.
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

## How to update

- Workers: read this first; put your token estimate and one lesson in your final report. Don't edit this file.
- The lead adds the Finished row and Lessons line at merge, and moves **Now** forward.
- Ratio = actual / budget. Under 1.0 is good; over 1.5 means stop and report.
