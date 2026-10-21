# D-416 · Ponytail gets an equal vote on major decisions

- **Date:** 2026-10-19 (applied 2026-10-20)
- **Status:** DECIDED (Robbie)
- **PR:** #316

Robbie: "ponytail is supposed to be very good. let ponytail have a vote that is the same weight
as the lead, so if you get to a major decision and disagree, come to me for the tie breaker."

On a major decision (L-sized task, new feature or place type, how data is stored or served,
reshaping roadmap scope, anything hard to undo, merging over a ponytail-review "Must fix"), a
fresh agent runs ponytail on the plan or PR and votes. Agree → go; disagree → Robbie breaks the
tie, both positions shown side by side with no recommendation. Small calls stay the lead's
(D-373). Each vote is logged in the PR's decision file. Text in `.claude/agents/lead.md` §3.
