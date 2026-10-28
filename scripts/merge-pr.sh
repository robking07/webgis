#!/usr/bin/env bash
# Merge a PR safely (docs/branching.md): refuse if the branch is behind main or a
# check isn't green, or a code PR lacks its ponytail-review verdict, then merge.
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

# Skipped counts as passing above. The heavy checks only run on ready (non-draft) PRs
# (D-168), so a code PR (build passed, not skipped) must also have them passed.
checks=$(gh pr checks "$pr" || true)   # tab-separated when piped: name, status, ...
status_of() { awk -F'\t' -v n="$1" '$1 == n { print $2; exit }' <<<"$checks"; }
if [ "$(status_of build)" = "pass" ]; then
  for heavy in "click-through" "speed + accessibility"; do
    s=$(status_of "$heavy")
    if [ "$s" != "pass" ]; then
      echo "PR #$pr: heavy checks haven't run on the ready PR yet; wait for them (\"$heavy\" is ${s:-missing})." >&2
      echo "Mark the PR ready (gh pr ready $pr) if it's still a draft, wait for CI, then retry." >&2
      exit 1
    fi
  done
  # Code PRs need the ponytail-review verdict (docs/handbook.md §3) in the PR body.
  if ! gh pr view "$pr" --json body --jq .body | grep -q '^Ponytail verdict: Ship'; then
    echo "Refused: PR #$pr has no 'Ponytail verdict: Ship' line. Run the ponytail-review skill and paste its verdict into the PR body." >&2
    exit 1
  fi
fi

# The repo deletes the branch on GitHub after merging (delete_branch_on_merge).
gh pr merge "$pr" --merge --match-head-commit "$head"
echo "Merged PR #$pr. Remove its worktree: git worktree remove .claude/worktrees/<name>"
