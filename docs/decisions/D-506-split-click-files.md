# D-506 · Split the click files: one tract file per map per county

- **Date:** 2026-10-29
- **Status:** DECIDED. Lead: plan as written · Ponytail: AGREE with 3 cuts · Outcome: cuts adopted, no tie (2026-10-29).
- **PR:** #406 (issue #371): the readers. #407: the writer, the split step, the guard and the one-off workflow, merged first.

**The three cuts (2026-10-29):** no county-list comparison against R2 (publish never deletes, and the
per-file check is enough); no freeze of `values/tracts/`: ingest stops writing those files and the
existing drop guard stays on that prefix; no Library paragraph. The lead also settled the open
questions: the split runs as a one-off GitHub workflow, not on Robbie's machine; the old files stay on
R2; the phone line's N comes from the registry; the 87- and 174-request fan-out is accepted.

**Cut 1 reversed after code review: stale county files (2026-10-29, lead).** A reload clears the
map's local folder and writes only the counties it has, so a county that dropped out kept its old file
on R2, and the panel would show old numbers. The county check is back (rule 3).

## 1. Today

**Layout.** Each county has one file with every map's tract values, `values/tracts/<county>.json` =
`{ <dataset id>: { <6-digit tract>: [value, moe] } }` (D-113, on R2 since D-210). All 87 maps with
tract data are in every file. `writeTractValues` (`data/ingest/src/values.ts`) reads the local file,
swaps in one dataset and writes it back, so a checkout without the files writes new ones holding
only the dataset it just loaded. That is how a partial folder wiped live tract data on 2026-10-08.
Since then `publish-tiles.ts` (`guardTractShard`) fetches the live file before each upload and
refuses one that drops a dataset key, and `publish-reload` (Data run, D-478) merges into the live
file. Both are checks on a shared file; nothing in the layout stops the mistake.

**Sizes, measured 2026-10-29 with plain GETs from `tiles.mapwich.org`:**

| County | Tracts | Raw | Gzipped (what a visitor downloads) | One map's slice, gzipped |
|---|---|---|---|---|
| Los Angeles, CA (06037) | 2,474 | 4.62 MB | **1.38 MB** | 6.7–19 KB (median 17.6 KB) |
| Hennepin, MN (27053) | 328 | 611 KB | 180 KB | 0.9–2.6 KB |
| Bibb, AL (01007), a median county | 8 | 16.7 KB | 5.0 KB | 63–118 B |

(The median county has 8 tracts: 2024 Gazetteer, 85,396 tracts in 3,222 counties.) By topic, LA's
file splits into People 386 KB (22 maps), Economy 233 KB, Transportation 213 KB, Environment 206 KB,
Housing 182 KB, Health 159 KB. LA's tract **counts** file (`values/counts/tract/06037.json`, 55
series) is another 1.33 MB; a map click does not load it, the tract place page does (KeyNumbers).

**Who reads the tract file** (all through `apps/web/src/lib/details.ts`):

| Reader | Needs | Loads today |
|---|---|---|
| Details panel on a tract click (`DetailPanel` → `fetchDetail`) | the 1–2 maps on screen | whole file |
| Phone sheet's full list (`PlaceDataList` inside `BottomSheet`) | every map, once swiped up | whole file, at click time |
| Tract place page (`PlaceProfile`, `KeyNumbers`) | every map | whole file |
| Compare (`ComparePlaces`, two tracts) | every map | two whole files |
| Region data pack (`TractPack` → `loadTractShard` + `loadTractGeoShard`, `csv.ts tractPack`) | every map, one county | whole file |
| Unreliable-tract hatching (`useUnreliable`) | one map, every county in view | whole file per county |
| Change-map margins (`useChangeMoes`) | one map, every county in view | whole file per county |
| Specials number scripts (`acs-explainer.mjs`, `holmes-county-bikes.mjs`) | a few maps | whole file (run by hand) |

Not readers: `similar.ts` and the Specials build (`prepare.mts`) read `details/<state>.json` and
county value files, never tract files, so they don't change. `SimilarPlaces` reads a bundled
`similar.json`.

## 2. Proposal

**New file: `values/<dataset id>/tracts/<county>.json` = `{ <6-digit tract>: [value, moe] }`.**
One file per map per county, inside the map's own folder, beside its `tract.json`.

Why this grain:

- **Per map per county** (this): an LA click loads the 1–2 maps on screen, **18–38 KB**. A map's
  ingest writes only its own folder. About 87 × 3,222 ≈ 280,000 objects, all small.
- Per topic per county (6 files): an LA click would still load 233–386 KB, and each file again holds
  many maps, so it keeps the shared-file danger and needs the live-merge step forever. Rejected.
- Per map per state: 4,500 objects, but a Texas county's place page would fetch 87 Texas-wide files
  (~4 MB) and the region pack would fetch whole states. Rejected.

The cost of the chosen grain is request count where a page needs every map: an LA place page, the
pack or Compare make 87 (or 174) small parallel requests over HTTP/2 to Cloudflare, about the same
bytes as today. That is fine for pages that ask for everything; the click, the thing visitors do
most, gets the big win. The hatching and change margins get the biggest win (one map per county
instead of all 87).

**What a click loads.** `fetchDetail(geoid, ids)` takes the map ids it needs. The details panel asks
for the primary and secondary map only. On the phone, `BottomSheet` gets a `lazy` prop and renders
its children only after the first swipe up, so the full list (and its 87 requests) waits until the
visitor asks for it. "Swipe up for all N datasets here" takes N from the registry (maps with tract
data) instead of the loaded rows. The desktop panel already shows only the on-screen maps plus a
link to the place page, so it stays as it is. Map-first: nothing new on screen.

**Code shape.** `loadTractShard(county, ids)` fetches the ids' files in parallel and assembles the
same `{ id: rows }` object as today, so `detailFromTractShard`, `unreliableTracts`, `tractPack` and
the `TractShard` type don't change. A missing file (404) means no data for that map, as now. Both
`loadTractShard` and `fetchDetail` default `ids` to `TRACT_IDS` (every registry map with tract
data), so the place page, Compare and the pack need no change.

## 3. The safety rule

A partial local folder must not be able to delete or shrink another map's live tract values.

1. **Each map owns its folder.** Tract values for map X live only under `values/X/tracts/`, and only
   `writeTractValues("X", …)` writes there (it clears and rewrites that folder from X's own load).
   No step reads or writes a file holding other maps' tract values. A checkout that holds only X
   can upload only X's files, so there is nothing of Y's in it to lose.
2. **Publish never deletes.** `publishJson` only puts objects; there is no delete call anywhere in
   ingest, and this stays so (the review checks it).
3. **No shrink of a map's own files, checked before anything goes up.** `publishJson` checks every
   changed file first (`uploadProblems`). It refuses a map's tract file that drops a live tract, a
   count shard that drops a live dataset, and a reloaded map whose county files on R2 include one this
   load lacks. For that last check it reuses the one paginated listing publish already makes, and it
   fetches only changed files R2 already holds. If any check fails, nothing is uploaded.
   `ALLOW_TRACT_DROP=1` stays the only override, for a real loss (a new tract vintage). The Data run
   has an "Allow tract drop" input for it, default off, set on the publish step only.
4. **The old files stop being written.** `writeTractValues` no longer writes `values/tracts/`; the
   existing drop guard stays on that prefix. `publish-reload` drops `values/tracts` from its merge
   list (the counts shards keep theirs).

Rules 1 and 2 make the 2026-10-08 incident impossible by layout, not by a check. Rule 3 covers the
remaining case, a short reload of the same map.

## 4. Migration and rollback

1. **PR #407 first** (no reader changes, safe to merge): the per-map writer, the guard, the one-off
   step `ingest split-tracts` and the workflow `.github/workflows/split-tracts.yml`. The step lists
   and reads every live `values/tracts/<c>.json` on R2 (not a local copy, so the incomplete-folder
   trap can't bite) and writes `data/tiles/values/<id>/tracts/<c>.json`; it refuses to run if
   data/tiles already holds per-map files.
2. **The lead runs the workflow** (main only, the "data" environment, the Data run's concurrency
   group). The runner's data/tiles starts empty, so `publish-values` sends only the new files (about
   280,000 PUTs, under a third of R2's free monthly writes). The lead curl-checks LA, Hennepin and a
   median county for a few maps (200, same numbers as the old file).
3. **No dataset reloads or Data runs** from the #407 merge until #406 merges: reloads now write only
   the new files, which the site doesn't read yet.
4. Merge #406 (CI's click-through reads live R2, so it passes only after step 2); Vercel deploys; the
   site reads the new files. The old files stay on R2, untouched.
5. **Rollback:** revert the web commit. The old files are still on R2 and still current until the
   first reload after the switch; after that, a rollback shows those maps' pre-reload tract values
   in the panel until a reverse join is written (left out, below). Deleting `values/tracts/` on R2
   is a later, separate call for Robbie, not part of this task.

## 5. Readers that change, and the check for each

| Change | Check |
|---|---|
| `lib/details.ts`: per-map URL, `TRACT_IDS`, `loadTractShard(county, ids)`, `fetchDetail(geoid, ids)` | `details.test.ts`: only the asked maps' files, every map by default, 404 = no data |
| `DetailPanel`: on-screen ids; phone sheet `lazy` with its own full-list load; N from registry | e2e (`menus.spec.mjs`, "tract click: loads only the map on screen"): the click requests only the primary map's file; on a phone the swipe up loads the rest; no old file |
| `BottomSheet`: `lazy` prop | same e2e; the other three sheets don't pass it and are unchanged |
| `PlaceProfile`, `ComparePlaces`, `TractPack`: unchanged (default ids) | existing e2e for the tract place page, Compare and the pack download still pass |
| `useUnreliable`, `useChangeMoes`: pass the one map id | existing hatching and change-map e2e still pass |
| `values.ts writeTractValues` (#407) | `tracts.test.ts`: writes only its own folder, drops its stale counties, leaves other maps alone |
| `publish-tiles.ts` guard and `publish-reload` list (#407) | `publish-tiles.test.ts`: `isTractFile` matches only per-map files; a missing live tract counts as a drop |
| `split-tracts` (#407) | `tracts.test.ts`: one all-maps file → per-map files; the lead's curl check in step 2 |
| `runbook.md` §8 (#407), comments naming `values/tracts/` | read-through; paths exist |

Unchanged: `similar.ts`, `counts.ts` and the counts shards, `prepare.mts`, `details/<state>.json`.

## 6. Size

**Estimate: about 160k tokens** for the build (web 50k, ingest and guards 45k, tests 35k, docs and
review 30k), inside the issue's 250k.

**Smallest version that meets both done-checks** is everything in sections 2–5: an LA click drops
from 1.38 MB to about 38 KB, and a partial upload can only touch its own map's folder.

**Left out on purpose:**

- Splitting the tract **counts** shards (LA 1.33 MB on the tract place page). Same pattern, own
  follow-up; the existing drop guard keeps covering them.
- Loading the place page's list per topic on open; revisit if
  the list of maps grows a lot (the Library, #372).
- A reverse join for rollback after the first reload, and deleting the old files on R2.
- Moving the Specials number scripts to the new paths (they read the frozen old files and still run).
- Guarding a full `publish-data` from a stale but complete copy overwriting newer values. That
  risk exists today for every value file and isn't what this issue fixes.
