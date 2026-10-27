# D-447 · Publish every Combination that passes the automatic checks

- **Date:** 2026-10-27
- **Status:** DECIDED (Robbie)
- **PR:** #347

Robbie: "the reviewer signin thing is annoying, I wanted you to simply publish them all, add
navigation, and display a handful on the landing page." This replaces D-116's hand review: every
pair with status `published` in `insights.json` (passed the automatic checks) shows on Specials,
on `/specials/combinations` and on dataset pages. The review page, its revalidate route and the
approval lookup are gone. The navigation and the handful already existed (Specials page), so no
new UI. The `reviewers` and `insight_reviews` tables stay in the database, unused.
