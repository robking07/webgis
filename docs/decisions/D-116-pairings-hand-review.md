# D-116 · Odd Pairings: every dataset in, every card vetted by hand

- **Date:** 2026-10-01
- **Status:** DECIDED (Robbie: "Odd Pairings should include everything but I'll want to vet every card"; chose the review page on Mapwich) / DEFAULTED (details below; built in prototype-style momentum as a full feature)
- **PR:** #16

**Decided (Robbie).** Every dataset can appear in Odd Pairings, including race, nativity,
language and 287(g) agreements. Nothing reaches the public until Robbie approves it. He
chose a private review page on the site over a Claude-synced review deck and a checklist
file on GitHub.

**How it works.**
- **The automatic checks still run first** (tiny samples, shared denominators, by-construction
  pairs, regional-only patterns: SPEC §10). Only pairs that pass go to the review queue; the
  rest stay "held back" and are never shown as cards. With all 57 datasets: 1,485 pairs,
  **272 in the queue**, 1,213 held back.
- **Review page:** `/specials/review` (no index, not linked in the nav). Sign-in uses an
  emailed one-time link (Supabase Auth, free tier, default email template). Each card shows
  its headline, caption, scatter plot and statistics, and links to the bivariate map.
  Approve / Reject with an optional private note; keys A / R, J / K. Tabs: To review /
  Approved / Rejected (verdicts can be changed any time).
- **Fingerprint:** the insights export now hashes each card's numbers and wording. An
  approval holds only while the fingerprint matches, so a re-ingest or new caption sends
  the card back to "To review" (marked "changed since you last reviewed it").
- **Publishing:** `/specials`, `/specials/<id>` and the pairings list on `/data/<id>` show
  approved cards only. They read approvals server-side (cached for an hour), and the review
  page refreshes them right after each verdict (`/api/specials/revalidate`, which accepts
  only a signed-in reviewer's token). Pages stay cached, so viewing doesn't depend on the
  database being awake (D-02). Until the first approval, Specials says "No pairs have been
  approved yet."

**Database** (`supabase/migrations/20261002000000_insight_reviews.sql`, `…01_insight_reviews_grants.sql`).
- `reviewers(user_id)`: who may vet. Nobody can add themselves; rows are added with SQL.
- `insight_reviews(insight_id, fingerprint, verdict, note, reviewed_by, reviewed_at)`:
  reviewers read and write (RLS; `reviewed_by` must be the signed-in user). The public
  can read only `insight_id`, `fingerprint` and `verdict` of approved rows.
- **Found and fixed while testing:** this project's default privileges give `anon` and
  `authenticated` every privilege on new tables, so the first migration's column-level grant
  did nothing and private notes on approved cards would have been readable through the
  public API. The second migration revokes all and grants exactly the above. Verified with
  real rows: anon can read approvals; notes, reviewer ids, `select=*` and deletes are refused.
  Non-reviewers can't write; reviewers can't spoof `reviewed_by` or add themselves. An
  end-to-end browser test with a temporary reviewer (deleted afterwards) approved and
  rejected cards and saw the approved one appear on `/specials`.
- **Follow-up:** the same default privileges apply to the older tables (RLS still limits
  them to reads), and the database's `insights` table exposes unvetted template captions
  through the API (the site doesn't read it). Tighten both in a later pass.

**Setup Robbie does once.**
1. Supabase dashboard → Authentication → URL Configuration: Site URL `https://mapwich.org`;
   add Redirect URL `https://mapwich.org/**`, plus `http://localhost:3000/**` for local use.
2. Open `https://mapwich.org/specials/review`, request a link, sign in. The page then shows
   a one-line SQL insert with his user id; run it in the SQL editor, or ask Claude to.

**Defaults.** Pairs that fail the automatic checks aren't reviewable (they'd add ~1,200
cards and SPEC §10 says never publish them). Captions stay template captions; AI captions
remain optional (D-30), and any caption change re-queues the card. The 287(g) exclusion
from D-29 is lifted because every card is now vetted.

## Amendments

- 2026-10-27 (Robbie): hand review dropped; every card that passes the automatic checks is published. See D-447.
