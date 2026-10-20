# D-383 · "Odd Pairings" is now "Combinations"

- **Date:** 2026-10-20
- **Status:** DECIDED (Robbie: "Remove the 'odd' from odd pairings. call it combinations")
- **PR:** #283 (issue #280, part A)
- **Follows:** D-115, D-116, D-377

All visitor-facing text says "Combinations" (headings, titles, share cards, the Specials front page, data pages, glossary, review page). The list page moved from `/specials/pairings` to `/specials/combinations`; a permanent redirect in `apps/web/next.config.ts` keeps old links and `?topic=` filters working. Internal ids, types, function and file names, the `insights` table and `data/ingest/src/insights.ts` are unchanged, so captions and fingerprints (and so approvals) stay as they were. "pairings" and "combinations" are both reserved Specials file names.
