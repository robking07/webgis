# CLAUDE.md

Full build spec: `docs/SPEC.md` (read it before writing code). Open questions and
stop-conditions are logged as decisions: one file each in `docs/decisions/` (D-100 and up);
D-01 to D-99 are in `docs/DECISIONS.md` and frozen.

## Core Directive — one clarifying question, continually reevaluated

After every user request, and after every step of a multi-step task, re-evaluate the
goal, the assumptions made so far, and what the last step revealed. Then ask exactly
ONE clarifying question about the highest-value open uncertainty (use AskUserQuestion).
Never ask something already answered. Never ask filler.

- **Prototype mode (now → first review session):** the question must not block. Ask
  it, state the default you're taking, and keep building. Log it as a decision.
  The only time to stop and wait is a SPEC §10 stop-condition or a §12 open decision.
- **Refinement mode (after Robbie says the review is done):** ask the question and
  wait for the answer before continuing.

Current mode: **REFINEMENT** (since 2026-10-01). Ask and wait before decisions. Switch back to
prototype-style momentum only for a full new feature buildout or a similarly large task, and say so
when you do.

## Project lead (`claude --agent lead`)

Robbie brings ideas, UX notes and feedback to one project-lead agent (`.claude/agents/lead.md`).
It files them as GitHub issues (`idea` → `queued` → `building` → closed; `needs-robbie` while it
waits on him) and assigns each one to a worker, then verifies and merges the work. The lead batches its
questions to Robbie in plain language instead of following the one-question rule above.

**If you are a worker the lead briefed:** don't ask Robbie anything and don't merge. Open a
draft PR with "Closes #N" in it. Put any choice that is Robbie's (what users see, scope,
editorial, data judgment, cost) in your final report for the lead, with the options you see.

## Conventions

- Adding a dataset = registry entry + ingest script only. No UI code.
- All symbology comes from `packages/design` tokens. No ad hoc layer styling.
- Never touch Robbie's NAS, home network, or Met Council internal systems or non-public data.
  Open data the Met Council publishes publicly (e.g. on the MN Geospatial Commons) is allowed,
  under the same license checks as any other source (Robbie, 2026-10-01; DECISIONS D-16).
- Secrets live in `.env.local` only (Supabase, Census, Anthropic, R2, Vercel; names in `.env.example`). Never commit them,
  never print them, and never pass them as command-line arguments.

## Branches, PRs and decision numbers (`docs/branching.md`)

Other Claude sessions are often working in parallel. To avoid collisions:

- Every task gets its own worktree on a new branch from the latest `origin/main`. Never
  stack on an unmerged branch, and never commit to `main` or edit the main checkout.
- Open the PR (draft) right after the first commit. **Decision ID = PR number + 100**
  (PR #12 → D-112), in its own file `docs/decisions/D-112-<slug>.md`. Never pick the
  "next" number by reading the log.
- Before merging, merge `origin/main` into the branch and push. Merge only with
  `bash scripts/merge-pr.sh <n>`, then remove the worktree and local branch.
