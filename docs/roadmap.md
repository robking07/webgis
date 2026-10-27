# Mapwich roadmap

**Approved for building (Robbie, 2026-10-05).** The living version, which the lead keeps current, is the
Claude Doc "Mapwich Roadmap": https://claude.ai/code/artifact/c2211bac-8fd8-47a3-a28c-6af3799d1fdc
(tab *Roadmap* = what and why; tab *Build plan* = tasks, sizes, order, practices). This file is
a compact mirror for agents. If they disagree, the doc wins.

**Status (2026-10-26): resting.** Robbie paused new work until he picks a new direction. Parked work keeps its plan on GitHub (label `parked`); see `docs/progress.md` → Now.

## Why

A free, non-commercial, map-first viewer of U.S. public data for **planners first, the public
second**. The core job is to **explore and compare data**. It is also Robbie's portfolio: a GIS
leader building with AI using agile and DevOps practice, not vibe coding.

Success by the end of March 2027:
- Robbie uses it weekly.
- It's portfolio-ready.
- 6 non-overlapping Specials are published.

Budget: free tiers by default, under $50/month.

## Responsible AI use, in every phase

1. Plan before building: a written spec and a size for each task.
2. Budget every task (S ≈ 100k, M ≈ 275k, L ≈ 500k agent tokens) on its issue and in its brief.
3. Stop and re-plan past 1.5× budget.
4. No agent when a script will do.
5. Log budget vs actual on each issue. The disclosures page publishes totals.

Every phase gate includes a usage check.

## Phases

Phases are gated on real use, not on dates. Each phase has: why, what we build, what it
accomplishes, done when, and not in this phase (see the doc).

| Phase | Tasks | Gate |
|---|---|---|
| **0 · Foundations** | G1 agent guardrails · F1 handbook + architecture map · F2 checks in GitHub CI (build, lint, click-through, leaked-secret scan, speed + accessibility on the preview) · F3 code-checker cleanup · F4 scripts into repo · F5 usage log (model + effort too) · F6 agent roles + review-lead verdict · F7 prune CLAUDE.md · F8 progress log · F9 prototype audit · F10 tag prototype release · G2 dependency alerts · G3 runbook + rebuild drill · S3 cost alerts + uptime email + browser error reporting · F11 project kit (#53: package the owner-led AI development setup for reuse; at the gate) | CI passes on every PR; handbook, roles and progress log exist; prototype tagged and audited |
| **1 · Compare reliably** | 1.1 side-by-side places · 1.2 change-over-time maps · 1.3 reliability warnings · 1.4 CSV download · 1.5 link previews (#37) · 1.6 disclosures page · 1.7 map polish (real phone) · 1.8 Specials pipeline · S1 static click details · S2 data files to R2 | Robbie uses compare and change maps in a real conversation; first Special in draft |
| **2 · Depth for planners** | 2.4 transit (NTD) · 2.2 MPO boundaries + data · 2.8 MPO plans catalog (UPWP, TIP, grant program, CMP, LRTP; Minnesota pilot, public docs only) · 2.6 scout datasets · 2.5 commute flows (LODES) · 2.1 metros + cities · 2.3 place search (#36) | A planner compares metros and commutes; Minnesota MPO profiles link their five core products |
| **3 · Portfolio-ready** | 3.1 About + Methods · 3.2 remaining Specials · 3.3 real-device + accessibility audit · 3.4 speed (#28) · 3.5 navigation · 3.6 go public (#44) · S4 self-hosted basemap · S5 1,000-user load test | Robbie would show it to a hiring manager without caveats; load test passes; 6 Specials live |

**DevOps additions (Robbie, 2026-10-05):** G1 hooks block pushes to main, merges outside
`scripts/merge-pr.sh` and reads of `.env.local`; G2 Dependabot alerts; G3 one-page runbook (rollback,
contacts) + one rebuild-from-scratch drill. The repo stays private on the free plan until 3.6, so F2
runs our own leaked-secret scan. Not adopted: Terraform, GitOps (oversized for free hosted services).

## Model and effort routing

Set per role in `.claude/agents/` (F6). Judge cost per finished task, not per message.

| Role or work | Model | Effort |
|---|---|---|
| Lead | Opus | medium |
| Review lead, editor | Opus | high |
| Engineers on S tasks, data scout | Sonnet | medium |
| Engineers on M/L tasks | Opus | medium |
| Code search | Haiku | — |
| Repeated mechanical work | no agent (script or lead) | — |

A Sonnet worker that fails one correction is retried on Opus with a better brief. No model switches
mid-task. Phase 0's S tasks are the Sonnet pilot; the Phase 0 gate keeps or changes this table.

**Not now:** Mapbox, paid data, tablet layout, accounts/uploads, comparing plan contents (possible
separate paid product), filter by value.

## Order of work

At most two workers, never on the same files. Each wave starts when the one before it has merged.

1. G1 guardrails (F5 starts), then F1 + F4
2. F7 + F8, then F6
3. F2 + 1.5, then S3
4. F3 + 1.4, then the Phase 0 gate (passed with conditions 2026-10-05; Phase 1 reordered after the review lead's check)
5. S1 (+ unit-test runner), then S2 (no new data files in git until S2; Robbie, 2026-10-05)
6. 1.3 + 1.1 (1.1 after S1: same files)
7. 1.2, then 1.6 + 1.8, then 1.7
8. The Phase 1 gate
9. Phase 2 in the order above
10. Phase 3

Robbie's nudge "next" means: take the next wave.

## From prototype to project

Code from before this roadmap is the prototype (tag `v0.1-prototype`). There is no rewrite:
- F9 marks each part **keep**, **harden** or **replace when touched**.
- New code meets the new standards from day one.
- Old code is upgraded only when a roadmap task touches it, inside that task's budget.

## Agent roles

| Role | Job |
|---|---|
| Lead | Plans, briefs workers, verifies, merges, keeps the roadmap current |
| Review lead | Skeptic; build / change / drop before phases and L tasks |
| Data engineer | Data tasks |
| UI engineer | UI tasks |
| Data scout | Finds datasets; gathers MPO document links |
| Editor | Drafts Specials in shared docs |

Definitions live in `.claude/agents/`: `lead.md`, `review-lead.md`, `data-engineer.md`, `ui-engineer.md`, `data-scout.md`, `editor.md` (F6). Each sets `model` and `effort` in its frontmatter.
