# Branches, PRs and decision numbers

Several Claude sessions often work on Mapwich at once. These rules keep them from
colliding. Robbie doesn't need to run any of this; every session follows it.
The project lead (`claude --agent lead`, D-118) assigns tasks to workers and is the one that merges.

## The loop

1. **Start from the latest `main`.** Each task gets its own worktree
   (`.claude/worktrees/<name>`) on a new branch cut from `origin/main`. Never build
   on another unmerged branch; if work depends on it, wait for it to merge.
2. **Name the branch by kind:** `data/<dataset-id>`, `ui/<topic>`, `fix/<topic>`,
   `perf/<topic>`, `chore/<topic>`, `notes/<topic>`.
3. **Open the PR early,** as a draft, as soon as there's a first commit. The PR number
   is the decision number (below), so you need it before writing the decision.
4. **One task per PR.** Small PRs merge quickly and rarely conflict.
5. **Before merging, bring the branch up to date:** `git fetch origin && git merge
   origin/main`, re-run the checks, push.
6. **Merge with `bash scripts/merge-pr.sh <number>`.** It refuses if the branch is
   behind `main` or a check is red, then merges. GitHub deletes the branch.
7. **Clean up:** `git worktree remove .claude/worktrees/<name>` and
   `git branch -d <branch>`.

Never commit to `main` directly. The main checkout (`~/webgis`) stays on `main`
and is only updated with `git pull`.

## Decision numbers

- **D-01 to D-99** are the old entries in `docs/DECISIONS.md`. They're frozen: amend
  them in place, but add nothing new there.
- **New decisions are one file each** in `docs/decisions/`, named
  `D-<PR number + 100>-<slug>.md`. PR #12 → `D-112-branch-rules.md`. GitHub never
  hands out the same PR number twice, so two sessions can't take the same ID.
- One decision file per PR. Later changes to a decision are amendments inside its
  file (with the date and who decided), not new numbers.
- A follow-up decision in a later PR gets that PR's number and links back.
- Refer to the decision in commits and the PR title once the number exists.

## What enforces this

`.github/workflows/pr-checks.yml` runs on every PR:

- **Branch includes the latest main**: fails if `main` moved since the branch last
  merged it.
- **Decision numbers**: `scripts/check-decisions.mjs` fails on a reused ID, a new
  entry in the frozen `DECISIONS.md`, or a decision file whose number isn't this
  PR's number + 100.

The repo is private on the free plan, so GitHub can't *require* checks before
merging. `scripts/merge-pr.sh` is the gate instead; always merge through it.

## Guardrails

The rules above are also enforced for every Claude session and worker, not just
asked for. `.claude/settings.json` registers a hook (`.claude/hooks/guardrails.mjs`)
that checks each command before it runs and refuses these, with a message saying what
to do instead:

- **Pushing to `main`** (`git push origin main`, `HEAD:main`, or a bare `git push`
  while on `main`). Push your branch with `git push -u origin <branch>`.
- **Force pushes** (`--force`, `-f`, `--force-with-lease`, `+branch`). They can erase
  other sessions' work. Merge `origin/main` into the branch instead.
- **`--no-verify`** on any git command. It skips the checks.
- **Merging a PR any other way** than `bash scripts/merge-pr.sh <n>` (so no
  `gh pr merge`, no `gh api .../merge`). The script is the gate: it refuses when the
  branch is behind `main` or a check is red. The script itself still works.
- **Reading or printing `.env.local`** (the Read tool, or `cat`, `grep`, `source`,
  `printenv` and the like). It holds secrets. Use `.env.example` to see variable
  names. Scripts such as `bash scripts/db-push.sh` load it themselves and keep working.

Everything else in the loop (worktrees, commits, `git push -u origin <branch>`,
`git merge origin/main`, `gh pr create/ready/view/diff/checks`) is unaffected.

This is a safety net against mistakes, not a security boundary: a determined shell
trick can get around a text check. Run `npm run test:guardrails` after changing the hook.
Because the hook ships in the repo, a new worktree gets it automatically.
