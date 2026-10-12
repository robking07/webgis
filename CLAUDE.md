# CLAUDE.md

Mapwich (repo `webgis`): a non-commercial, educational, map-first US data viewer. Robbie owns it.

## Read first

1. `docs/handbook.md`: worker rules, setup, env var names, checks, reporting.
2. `docs/roadmap.md`: what we're building and in what order.
3. `docs/branching.md`: worktrees, branches, PRs, decision numbers, merging.
4. `docs/progress.md`: running log of what shipped and what we learned.

`docs/SPEC.md` is history and background; read it only if a task needs it. Decisions: one file
each in `docs/decisions/` (D-100 and up); D-01 to D-99 are in `docs/DECISIONS.md`, frozen.

## Who asks whom

- Robbie talks to the project lead (`claude --agent lead`, `.claude/agents/lead.md`). It files
  GitHub issues, assigns workers, verifies and merges, and batches plain-language questions to him.
- **Workers the lead briefed:** never ask Robbie anything and never merge. Open a draft PR with
  "Closes #N". Put any choice that is Robbie's (what users see, scope, editorial, data judgment,
  cost) in your final report to the lead, with the options you see.
- **Sessions Robbie runs directly:** ask him before product decisions (same list), one clear
  question at a time, and wait for the answer.

## Hard rules

- Adding a dataset = registry entry + ingest script only. No UI code.
- All symbology comes from `packages/design` tokens. No ad hoc layer styling.
- Never touch Robbie's NAS, home network, or Met Council internal systems or non-public data.
  Open data the Met Council publishes publicly (e.g. MN Geospatial Commons) is allowed under the
  same license checks as any other source (D-16).
- Secrets live in `.env.local` only (names in `docs/handbook.md` §1). Never commit them, print
  them, or pass them as command-line arguments.
- Every task gets its own worktree and branch from the latest `origin/main`. Never commit to
  `main`, edit the main checkout, or stack on an unmerged branch.
- Open the PR (draft) right after the first commit. Decision ID = PR number + 100
  (PR #12 → `docs/decisions/D-112-<slug>.md`). Never pick the "next" number from the log.
- Code work follows ponytail (smallest complete change) and gets a `ponytail-review` before the
  report and again before merge (`docs/handbook.md` §2–3). Repo rules win where they disagree.
- Merge only with `bash scripts/merge-pr.sh <n>` (after merging `origin/main` into the branch),
  then remove the worktree and local branch.
