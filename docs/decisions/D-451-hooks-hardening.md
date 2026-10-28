# D-451 · Rules enforced by hooks, not prose

- **Date:** 2026-10-27
- **Status:** DECIDED (Robbie)
- **PR:** #351

Robbie approved `drafts/setup/hooks-hardening.md` items 1–6: if we correct the same thing twice,
a hook or script refuses it. The lead may mark PRs ready, merge via `scripts/merge-pr.sh`, edit
issues and comment (settings `allow`); personal and money connectors and risky Vercel tools are
denied. `merge-pr.sh` refuses a code PR without `Ponytail verdict: Ship` in its body (docs-only PRs
exempt). The guardrail hook blocks browser user agents, writes outside `~/webgis`, any NAS or
network-share path, and edits to the main checkout outside `drafts/` and `data/cache/`.
Items 7–8 (label drift report, stale-memory dates) wait.
