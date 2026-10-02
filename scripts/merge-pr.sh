#!/usr/bin/env bash
# Merge a PR safely (docs/branching.md): refuse if the branch is behind main or a
# check isn't green, then merge.
#   bash scripts/merge-pr.sh <pr-number>
set -euo pipefail

pr="${1:?usage: bash scripts/merge-pr.sh <pr-number>}"

git fetch --quiet origin main
head=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
git fetch --quiet origin "$head"

if ! git merge-base --is-ancestor origin/main "$head"; then
  echo "PR #$pr is behind main. Merge main into the branch, re-check, push, then retry." >&2
  exit 1
fi

# Waits for running checks; exits non-zero if any fail.
gh pr checks "$pr" --watch --fail-fast

# The repo deletes the branch on GitHub after merging (delete_branch_on_merge).
gh pr merge "$pr" --merge
echo "Merged PR #$pr. Remove its worktree: git worktree remove .claude/worktrees/<name>"
