# Data intake: how a new source gets onto Mapwich (D-32)

Every dataset goes through Robbie. The scout researches; nothing is ingested without his approval.

```
weekly scout routine ──► GitHub issue per candidate (label: data-candidate)
                              │  Robbie reads the screen, then labels:
                              ├─ approved ──► Claude builds on a branch ──► PR "Closes #N"
                              │                    │  Vercel preview link on the PR
                              │                    └─ Robbie checks it (phone is fine) ──► merge = live
                              ├─ needs-license ──► contact the owner first (see docs/research/*-license-request.md)
                              └─ declined (comment why; the scout won't re-propose it)
```

## 1. Scout (automatic, weekly)

A Claude routine on claude.ai runs every Monday morning (Central). It follows `.claude/agents/data-scout.md`, then:

- **Dedupes** against `data/registry/datasets/*.yaml`, `docs/research/*.md`, and every issue labeled `data-candidate` (open or closed).
- **Files at most 3 issues per run**, using `.github/ISSUE_TEMPLATE/data-candidate.md`, labeled `data-candidate`.
- **Never** edits code, pushes, ingests, or contacts anyone. Off-limits topics (below) go nowhere, not even into an issue.

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

## 3. Approve (Robbie)

Add the `approved` label (or comment "approve"). Add notes in a comment if you want a particular treatment.

## 4. Build (Claude, in a working session)

Ingest needs GDAL, tippecanoe and the R2 keys, so builds run locally, not in the routine. At the start of a session, Claude lists `approved` issues and, per issue:

1. Branch `data/<dataset-id>`; registry entry + ingest script (no UI code); glossary terms; facets if useful.
2. `npm run check:design`, the `dataset-display-review` skill, sanity checks against a published total.
3. PR titled with the dataset name, body "Closes #N", with the sanity numbers. Label the issue `building` while in progress.

## 5. Review and publish (Robbie)

Open the Vercel preview link on the PR, look at the map and `/data/<id>`, then merge. Merging to `main` deploys to mapwich.org.

## Never ingest

Real-time sightings or locations of people or agents (ICE watch / rapid-response maps); data whose terms forbid redistribution or database use (TRAC, Vera, Gun Violence Archive); anything identifying private individuals or homes. Paid data stays off the public site.
