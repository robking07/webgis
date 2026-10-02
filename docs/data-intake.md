# Data intake: how a new source gets onto Mapwich (D-32)

Every dataset goes through Robbie. The scout researches; nothing is ingested without his approval.

```
weekly scout routine ─┬─ discovery ──► issue per candidate (data-candidate)
                      └─ release watch ──► issue per gov release (gov-release; + data-candidate if mappable)
                              │  Robbie reads the screen, then labels:
                              ├─ approved ──► Claude builds on a branch ──► PR "Closes #N"
                              │                    │  Vercel preview link on the PR
                              │                    └─ Robbie checks it (phone is fine) ──► merge = live
                              ├─ needs-license ──► contact the owner first (see docs/research/*-license-request.md)
                              └─ declined (comment why; the scout won't re-propose it)
```

## 1. Scout (automatic, weekly, two tracks in parallel)

A Claude routine on claude.ai ("Mapwich data scout (weekly)", `trig_01KCTp62anhYKbk74ARNiPkF`, Mondays 8:17 am Central, Opus) runs every Monday morning. To change its schedule or prompt, edit it on claude.ai/code under Routines, or ask Claude to update it. It follows `.claude/agents/data-scout.md` and runs both tracks every time:

- **Discovery**: new datasets from any source, government or not. It files at most 3 issues per run, using `.github/ISSUE_TEMPLATE/data-candidate.md` and the label `data-candidate`.
- **Government release watch**: new, revised, discontinued and removed federal datasets since the last run. For each, it reports what changed versus the prior vintage, whether the series is still comparable, independent cross-checks with numbers side by side, and archived copies of anything removed. It files at most 3 issues per run, using `.github/ISSUE_TEMPLATE/gov-release.md` and the label `gov-release`. Releases worth mapping also get `data-candidate`. The scout reports sourced facts and leaves interpretation to Robbie.
- **Dedupes** against `data/registry/datasets/*.yaml`, `docs/research/*.md`, and every issue with either label, open or closed. For a release already filed, it comments on the existing issue only if something new happened.
- **Never** edits code, pushes, ingests anything, or contacts anyone. Off-limits topics (listed under "Never ingest" below) don't go anywhere, not even into an issue.

## 2. Screen (in the issue, filled by the scout)

Each issue answers, with the source's own words quoted:

| Check | Pass means |
|---|---|
| License | Open (public domain, CC0, CC BY, ODbL) or non-commercial (fine here, D-30). Share-alike noted. No license stated = `needs-license`. |
| Provenance | Who publishes and maintains it; for archived federal data, who mirrors it and since when. |
| Privacy and safety | No individuals, private homes, victims, or real-time locations of people (including officers or agents). Aggregates preferred. |
| Geography | Joins to state / county / tract GEOIDs, or is a point/line/polygon layer we can tile. |
| Quality | Collection method, known gaps and biases, latest vintage, update cadence. |
| Fit | Map treatment, natural comparisons already on Mapwich, value 1–5. |

The scout ends each issue with a verdict: **Recommend**, **Hold** (with the question to resolve), or **Not recommended**.

`gov-release` issues are also material for Specials: they can stay open as story leads even when nothing gets mapped.

## 3. Approve (Robbie)

Add the `approved` label (or comment "approve"). Add notes in a comment if you want a particular treatment.

## 4. Build (Claude, in a working session)

Ingest needs GDAL, tippecanoe and the R2 keys, so builds run locally, not in the routine. At the start of a session, Claude lists `approved` issues and, per issue:

1. Worktree on a new branch `data/<dataset-id>` from the latest `main` (`docs/branching.md`); open the PR as a draft after the first commit, so any decision can take its number (PR + 100). Registry entry + ingest script (no UI code); glossary terms; facets if useful.
2. `npm run check:design`, the `dataset-display-review` skill, sanity checks against a published total.
3. Mark the PR ready: titled with the dataset name, body "Closes #N", with the sanity numbers. Label the issue `building` while in progress.

## 5. Review and publish (Robbie)

Open the Vercel preview link on the PR, look at the map and `/data/<id>`, then merge (or tell Claude to; it merges with `bash scripts/merge-pr.sh <n>`, which refuses if the branch is behind `main` or a check is red). Merging to `main` deploys to mapwich.org.

## Never ingest

Real-time sightings or locations of people or agents (ICE watch / rapid-response maps); data whose terms forbid redistribution or database use (TRAC, Vera, Gun Violence Archive); anything identifying private individuals or homes. Paid data stays off the public site.
