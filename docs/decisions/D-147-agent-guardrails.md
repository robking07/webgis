# D-147: Agent guardrails as a hook plus deny rules

- Date: 2026-10-05. Decided by: Robbie (approved task G1, issue #46). PR #47.

## Decision

House rules that must never be broken are enforced by Claude Code, not only written
down. `.claude/settings.json` (project file, committed) registers a `PreToolUse` hook
(`.claude/hooks/guardrails.mjs`, Node, no dependencies) and `permissions.deny` rules
for `.env.local`.

## Why both

- **Hook** for Bash commands: it can read the command text, so it can tell
  `git push origin main` from `git push -u origin my-branch`, and `gh pr merge` from
  `bash scripts/merge-pr.sh 12` (hooks see only the top-level command, so the script's
  inner `gh pr merge` is not affected).
- **`permissions.deny`** for the Read tool on `.env.local`: it is the built-in
  mechanism for file paths. The hook also checks file paths, so a stray allow rule
  cannot reopen it.

## Limits

A text check on shell commands is a safety net, not a security boundary (e.g. a script
written to disk and then run could still do these things). Exit code 2 blocks the
tool call and shows the message to the agent. Tests: `npm run test:guardrails`.
Settings are read at session start, so already-running sessions pick the hook up
after a restart or `/hooks`.
