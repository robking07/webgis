# D-291 · Tester agent, one-week trial

- **Date:** 2026-10-12
- **Status:** DECIDED (Robbie)
- **PR:** #191

Robbie asked for an agent that uses the site systematically during quiet time to find issues and inconsistencies. The `tester` agent is read-only, works one area ("beat") per run, and reports to the lead, who verifies findings before filing issues. It can't run a browser, so map-only checks go on a "needs a browser look" list.

Trial rules (in `.claude/agents/lead.md`): one run per 5-hour usage window, only when 2 hours or less remain, Robbie hasn't written since the window started, no workers are running and nothing waits on a merge. Runs and windows are logged in `drafts/tester-log.md`. The trial stops after 10 runs or on 2026-10-19, whichever comes first. Then Robbie is asked whether it is effective and worth continuing, with a scorecard.

Technical default (lead): the accesslint `audit_html` tool is added to the tester's tool list so beat 6 can run.

## Amendments
