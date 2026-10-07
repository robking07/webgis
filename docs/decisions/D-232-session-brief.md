# D-232 · Session brief instead of a knowledge graph

- **Date:** 2026-10-07
- **Status:** DECIDED (Robbie: "If building it is not redundant then I think it is worthwhile")
- **PR:** #132

Robbie asked for a knowledge graph or similar so new sessions pick up work faster. We built a
generated brief, not a graph database. The repo is small (~5k hand-written lines) and Claude reads
it quickly. A separately kept graph would cost tokens on every change and would drift. The
lead's saved code map had already drifted 155 commits, still pointing at `public/data` after D-210.

`scripts/brief.mjs` rebuilds the picture from the sources of truth on every run: the progress-log
"Now", GitHub issues and PRs, worktrees, the registry, decisions and the code citing them, and
git churn. A SessionStart hook in `.claude/settings.json` hands it to each session (added by
Robbie, since agents may not edit Claude's own config). `docs/architecture.md` stays the one
hand-written code map.
