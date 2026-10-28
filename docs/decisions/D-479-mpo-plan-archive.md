# D-479 · MPO plan catalog and archive

- **Date:** 2026-10-28
- **Status:** DECIDED (worker defaults, for the lead to confirm)
- **PR:** #379 (issue #365, part A: data only)

Robbie approved Mapwich keeping its own copy of every MPO plan plus a Wayback Machine snapshot
(Next phase plan, 2026-10-28). Minnesota is the pilot. This PR is the data half; the profile UI
waits on #292 and #332.

## What it is

`data/registry/mpo-plans.json` lists each MPO with its official name, website and four documents,
under plain names a visitor may see (`labels`): Long-range plan, Transportation Improvement Program
(TIP), Work plan, Grants. Each document has a title, source URL, stated date where the source gives
one, and optional `parts` (plans published one file per chapter) and `note`. The ingest step adds,
per link: `checked` (date), `status`, `http` (status code or network error), `type`, `bytes`,
`sha256`, `file` (the kept copy) and `wayback` (snapshot URL).

- **Ids** are the NTAD `MPO_ID`s from `apps/web/public/mpo/index.json`, the same ids the `mpo=` focus
  uses (D-378), so the profile can join on them. A test checks every catalog id exists there.
- **The list of 8** matches MnDOT's MPO pages (Metropolitan Transportation Plan, TIP and UPWP lists)
  and the NTAD shapes that reach into Minnesota. Four are interstate (Duluth-Superior, Fargo-Moorhead,
  Grand Forks-East Grand Forks, La Crosse); their entries cover the whole MPO, not just the Minnesota side.
- **Current document** = the one in effect today (October 2026). Where a newer work plan is posted
  but not yet in effect, the note links it.
- **No grants page:** Duluth-Superior, Grand Forks-East Grand Forks and Rochester-Olmsted have none;
  those entries have `url: null` and a note. La Crosse's funding list sits on its TIP page.

## Status rules

`ok` is a 2xx response (except 202, which bot challenges use). `dead` is only 404, 410, or a domain
that no longer resolves. Everything else (401, 403, 429, 5xx, Cloudflare challenges, timeouts) is
`cant-verify`: those sites block scripts but may work in a browser, so they are never called dead.
Known limit: a 200 "soft 404" or a parked domain counts as `ok`; the lead's hand check covers it.

## Archive

- `npm run ingest -- mpo-plans` re-checks every link (sequentially), keeps each response in
  `data/cache/mpo-plans/<mpo id>/<doc>-<sha256 prefix>.<ext>` (git-ignored; a changed document gets a
  new file, so old versions stay), and records a Wayback snapshot: the newest one if it is under 90
  days old, otherwise an anonymous Save Page Now request (5 s apart, one retry after 60 s on a 429).
  A link that stops working keeps its last good copy and snapshot.
- `npm run ingest -- publish-mpo-plans` uploads the kept copies to the tiles R2 bucket under
  `plans/<file>` (so `https://tiles.mapwich.org/plans/<file>`), with the existing R2 helper. Keys
  carry the content hash, so re-runs upload only new versions. `--dry-run` lists what would go up
  without keys. Only documents (PDF, Word) are uploaded. Web pages and other types are not, because
  serving another site's HTML or SVG from our domain would run its scripts there; they rely on Wayback. A link marked `"host": false` is kept locally only.

## Refreshing it

Edit titles and URLs by hand in `mpo-plans.json` when an MPO posts a new plan, then run
`npm run ingest -- mpo-plans` (no keys needed, about 15 minutes) and commit the catalog. Upload with
`npm run ingest -- publish-mpo-plans` on a machine with the R2 keys. Another state = more entries
in the same file; nothing in the code is Minnesota-specific.
