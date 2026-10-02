# D-112 · Branch rules and collision-proof decision numbers

- **Date:** 2026-10-01
- **Status:** DECIDED (Robbie)
- **PR:** #12

**Problem.** Parallel Claude sessions each took "the next D-number" from their own,
out-of-date copy of `DECISIONS.md`. D-33 went to two branches (UI review, map review
batch) and D-34 to three (logo, block groups, year control), so merges had to renumber
(→ D-35 to D-37, D-39) and older commit messages carry the wrong IDs. Every new entry
was also appended to the end of the same file, so any two branches conflicted there.
Some branches were stacked on unmerged ones, and the main checkout sat on a feature
branch with local `main` 13 commits behind.

**Decided (Robbie).** A new decision's ID is its **PR number + 100** (PR #12 → D-112).
Robbie chose PR numbers over date-named files and over "claim the next number on main".
Because GitHub was only at #11, PR numbers would have collided with the old D-12 to
D-39; Robbie chose the +100 offset over a second naming style (PR-12) and over burning
issue numbers to push the counter to 40.

**Built.**
- One file per decision in `docs/decisions/`; `DECISIONS.md` frozen at D-99 (existing
  entries can still be amended in place). Unmerged `data/block-groups` (D-39) still fits.
- `.github/workflows/pr-checks.yml` on every PR: branch must include the latest `main`;
  `scripts/check-decisions.mjs` rejects reused IDs, new entries in the frozen log, and
  a decision file not numbered for its PR.
- The repo is private on the free plan, so checks can't be *required*;
  `scripts/merge-pr.sh` is the gate (refuses if behind `main` or a check is red).
- Repo setting: delete branch on merge.
- Workflow rules in `CLAUDE.md` and `docs/branching.md`.
