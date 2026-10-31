# D-536 · Library maps leave the click files; rounding slack; longer Data run

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker), for the lead. The three calls came from the lead on #373; how the
  site copes without the values is the worker's default.
- **PR:** #436 (refs #373, groundwork before the next ~300 Library maps).

## Why

After the pilot's Data run, `details/48.json` (Texas) was 2.42 MB raw / 0.63 MB gzipped, and every
state or county click loads one of these files. 300 more Library maps would roughly triple the
Library share. Library maps are not on place pages, compare places or similar places (D-521), so
the files only carried their values for the details panel.

## What changed

- **`ingest details` leaves `library: true` maps out** of `details/<state>.json`
  (`buildShards(..., leaveOut)`). The next Data run or `ingest details` + `publish-details` shrinks
  the live files; until then the old values just sit unused.
- **Details panel (state or county) on a Library map:** the value comes from the values the map
  already loaded, and the margin from `values/<id>/<level>.moe.json` (written by `ingest acs` for
  every ACS map, #154). Ranking, reliability hatching note and the U.S. benchmark are unchanged. The
  state benchmark ("Texas: x%") reads the map's `values/<id>/state.json` instead of the click file.
  Tracts were already per-map files.
- **No "Compare with…" on a Library map** (`canCompare` is false for `library`). A
  `/compare/A/B?d=<library id>` link falls back to the landing map with the existing note
  ("That map isn't available, so this is …"). Alternative not taken: feed the compare page's lead
  metric from the values files too (more code; Library maps get compare when promoted to Featured).
- **Rounding:** a Data Profile sum (no denominator, unit percent) between 100 and 100.5 reads as
  100 (`ROUNDING_SLACK` in `acs.ts`), so the published value never shows "100.1%". Above 100.5 is a
  real error and still fails the Library 0–100 check. The three maps dropped for 100.1%
  (home value under $100K, rent under $1,000, rent $2,000+) need a fresh `ingest library` run with
  the Census key to come back.
- **Data run** `timeout-minutes` 60 → 180.

## Known limits

- The panel's moe file fetch is one extra small request per Library map per level (cached).
- Old shared compare links with a Library `d` show the landing map, not the Library map.
