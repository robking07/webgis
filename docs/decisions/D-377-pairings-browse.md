# D-377 · Odd Pairings: approve all, a rule-based front-page pick, and a filterable browse page

- **Date:** 2026-10-19
- **Status:** DECIDED (Robbie: "approve all odd pairings as well … Show only the most interesting pairings … on the page itself and provide a way for users to browse odd pairings. You decide on navigation for that."; details by the lead, defaults by the worker)
- **PR:** #277 (issue #274)
- **Follows:** D-115 (Specials front page), D-116 (every card vetted by hand)

**Approve all.** Every pair that passes the automatic checks (1,768 today) is approved in
`insight_reviews` with its current fingerprint, attributed to Robbie as reviewer, by the one-off
`data/ingest/src/approve-all-pairings.ts` (dry run by default, `--apply` to write; idempotent,
keeps notes). D-116's fingerprint rule still holds: a re-ingest or caption change sends a card
back to "To review".

**Front page (`/specials`).** Instead of the first six approved pairs, `pickInteresting()` in
`lib/insights.ts`: |ρ| ≥ 0.4 (moderate or strong), not mostly regional, ranked by |within-state ρ|,
no dataset in two picked pairs, and pairs whose topics are not yet shown go first. Six cards.

**Browse (`/specials/pairings`).** Same URL and "All N pairings →" link. Filters in the query
string, rendered on the server (no 3.8 MB insights file in the browser): `topic` (registry
category, either dataset), `strength` (`strong` / `moderate` / `modest`), `q` (every word must
appear in the two dataset titles), `sort` (`strongest` default, `within`, `az` by pair title) and
`n` (cards shown, 30 more per "Show more"). Topic and strength are link chips; name and sort
submit as a plain GET form, so it works without JavaScript. The held-back list stays at the bottom.

**Defaults (worker).** "A to Z" sorts by "Dataset A × Dataset B" titles, since headlines all start
"Counties with higher…". The page is now rendered per request (it reads the query); approvals are
still the hour-cached fetch.
