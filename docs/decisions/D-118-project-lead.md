# D-118 · A project-lead agent manages the work

- **Date:** 2026-10-02
- **Status:** DECIDED (Robbie)
- **PR:** #18

The project has grown past the point where Robbie can track every parallel session himself. He
now brings feature ideas, UX notes and feedback to one agent, the project lead
(`.claude/agents/lead.md`). The lead assigns the work, keeps track of decisions and makes sure
the work gets finished.

- **How Robbie calls it:** a dedicated session, `claude --agent lead` (Robbie chose this over a
  slash command or a scheduled inbox). Any session can pick up where the last one left off,
  because the state lives on GitHub, not in the conversation.
- **The board is GitHub Issues** (default taken), alongside the data-intake labels (D-32).
  `idea` → `queued` → `building` → closed; `needs-robbie` while a question waits on him.
  Issues can be read on a phone, they survive between sessions, and status changes don't need
  PRs.
- **Workers** are background agents in their own worktrees. They open draft PRs
  ("Closes #N"), never merge, and never ask Robbie directly. The lead verifies the work and
  merges it with `scripts/merge-pr.sh`, following the merge-as-we-go practice.
- **Questions to Robbie** cover only what he'd notice or care about: what users see, scope and
  priority, editorial voice, data judgment, cost, and anything that can't be undone. The lead
  saves them up and asks them together in plain language, each with 2–3 options and a
  recommendation. For the lead, this replaces CLAUDE.md's "one question after every step"
  rule. Technical choices are the lead's to make.

## Amendments
