# D-506 · Split the click files: one tract file per map per county

- **Date:** 2026-10-29
- **Status:** PROPOSED (worker plan for issue #371; needs the independent vote before building)
- **PR:** #406 (issue #371)

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
the `TractShard` type don't change. A missing file (404) means no data for that map, as now.

**The Library (#372).** Library maps get the same files from the same writer. Nothing loads them on
a click unless a Library map is the one on screen. The place page lists Featured maps; #372's
"More in the Library (n)" line loads the Library maps' files when opened. 100 Library maps add
about 320,000 small objects (storage is a few MB).

## 3. The safety rule

A partial local folder must not be able to delete or shrink another map's live tract values.

1. **Each map owns its folder.** Tract values for map X live only under `values/X/tracts/`, and only
   `writeTractValues("X", …)` writes there (it clears and rewrites that folder from X's own load).
   No step reads or writes a file holding other maps' tract values. A checkout that holds only X
   can upload only X's files, so there is nothing of Y's in it to lose.
2. **Publish never deletes.** `publishJson` only puts objects; there is no delete call anywhere in
   ingest, and this stays so (the review checks it).
3. **No shrink of a map's own files.** Before overwriting `values/X/tracts/<c>.json`, publish fetches
   the live file (it already does this for shards) and refuses if the new one has fewer tracts. Before
   the first upload, it compares X's county list on R2 with the local one and refuses if a live county
   is missing locally. `ALLOW_TRACT_DROP=1` stays the only override, for a real loss.
4. **The old files are frozen.** After the switch, publish refuses any changed file under
   `values/tracts/`, so an old checkout can't overwrite them, and `writeTractValues` stops writing
   them. `publish-reload` drops `values/tracts` from its merge list (the counts shards keep it).

Rules 1 and 2 make the 2026-10-08 incident impossible by layout, not by a check. Rule 3 covers the
remaining case, a short reload of the same map.

## 4. Migration and rollback

1. **One PR** with the new writer, the guards, the web readers and a one-off step,
   `ingest split-tracts`. It reads each live `values/tracts/<c>.json` from `tiles.mapwich.org` with
   plain GETs (no keys, no local copy, so the incomplete-folder trap can't bite) and writes
   `data/tiles/values/<id>/tracts/<c>.json`.
2. **Upload before merge** (the S2 lesson: CI and the preview read live R2). Robbie, in a fresh
   worktree whose `data/tiles` is empty: `npm run ingest -- split-tracts`, then
   `npm run ingest -- publish-values`. Only the new files exist locally, so only they go up (about
   280,000 PUTs, under a third of R2's free monthly writes; listing adds about 280 calls). The lead
   curl-checks LA, Hennepin and a median county for a few maps (200, same numbers as the old file).
3. **No dataset reloads or Data runs** between the split and the merge (a few hours), or the old and
   new files would differ.
4. Merge; Vercel deploys; the site reads the new files. The old files stay on R2, untouched.
5. **Rollback:** revert the web commit. The old files are still on R2 and still current until the
   first reload after the switch; after that, a rollback shows those maps' pre-reload tract values
   in the panel until a reverse join is written (left out, below). Deleting `values/tracts/` on R2
   is a later, separate call for Robbie, not part of this task.

## 5. Readers that change, and the check for each

| Change | Check |
|---|---|
| `lib/details.ts`: per-map URL, `loadTractShard(county, ids)`, `fetchDetail(geoid, ids)` | `details.test.ts`: assembles the shard from per-map files, 404 = no data, one fetch per file per page view |
| `DetailPanel`: pass the on-screen ids; phone sheet `lazy`; N from registry | e2e (`menus.spec.mjs`): a tract click requests only `values/<primary>/tracts/<county>.json` (and the secondary), nothing under `values/tracts/`; swiping up loads the list |
| `BottomSheet`: `lazy` prop | same e2e; the other three sheets don't pass it and are unchanged |
| `PlaceProfile`, `ComparePlaces`, `TractPack`: pass every tract map id | existing e2e for the tract place page, Compare and the pack download still pass |
| `useUnreliable`, `useChangeMoes`: pass the one map id | existing hatching and change-map e2e still pass |
| `values.ts writeTractValues`: write `values/<id>/tracts/`, stop writing `values/tracts/` | new unit test: writes only its own folder, clears its stale counties, leaves other folders alone |
| `publish-tiles.ts`: shrink and county-list guards, freeze `values/tracts/`, `publish-reload` list | `publish-tiles.test.ts`: refuses fewer tracts, refuses a missing live county, refuses a changed old shard, allows with `ALLOW_TRACT_DROP=1` |
| `split-tracts` (new, one-off) | unit test on one fixture shard → per-map files; the lead's curl check in step 2 |
| `runbook.md` §8, `add-dataset` skill, comments naming `values/tracts/` | read-through; paths exist |

Unchanged: `similar.ts`, `counts.ts` and the counts shards, `prepare.mts`, `details/<state>.json`.

## 6. Size

**Estimate: about 160k tokens** for the build (web 50k, ingest and guards 45k, tests 35k, docs and
review 30k), inside the issue's 250k.

**Smallest version that meets both done-checks** is everything in sections 2–5: an LA click drops
from 1.38 MB to about 38 KB, and a partial upload can only touch its own map's folder.

**Left out on purpose:**

- Splitting the tract **counts** shards (LA 1.33 MB on the tract place page). Same pattern, own
  follow-up; the existing drop guard keeps covering them.
- Loading the place page's list per topic on open. Library maps already stay out (#372); revisit if
  the Featured list grows.
- A reverse join for rollback after the first reload, and deleting the old files on R2.
- Moving the Specials number scripts to the new paths (they read the frozen old files and still run).
- Guarding a full `publish-data` from a stale but complete copy overwriting newer values. That
  risk exists today for every value file and isn't what this issue fixes.
