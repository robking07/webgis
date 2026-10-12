# D-277 · Block groups load without a pause: values parsed and classified in a worker

- **Date:** 2026-10-12
- **Status:** DEFAULTED (worker; no visible change)
- **PR:** #177 (issue #28)

**Problem.** The first switch of a dataset to block groups froze the map for about half a second.
Measured on a real file (`census2020_pop_density/block_group.json`, 241,692 values;
`node scripts/bench-block-groups.mts`, Node 24, same V8 as Chrome):

| Step (main thread) | ms |
| --- | --- |
| `JSON.parse` of the 4.9 MB file | ~70 |
| `classifyUnivariate` | ~450 |
| packing the per-state expressions (`choroplethFillsByState`, D-114) | ~50 |

Classification was the stall, not the expressions: `Object.values` / `Object.entries` on an object
with 240k geoid keys cost ~150 ms each, and it ran three of them. MapLibre's own work on the 54
per-state expressions (parsing them, ~20 ms) is unchanged.

**Built.**
- Tracts and block groups (`LAZY_LEVELS`) load through `lib/values.worker.ts`: it fetches, parses,
  classifies (`classifyValues` in `packages/design`, shared with the main thread) and packs the
  classes by state (`packByState`, the O(geoids) half of `choroplethFillsByState`, theme-free).
  It replies with the geoids as one string and the values and classes as transferred typed arrays.
- The main thread rebuilds the values object and class map in 20k-entry slices with a yield between,
  and seeds the classification cache, so `classifyUnivariateCached` and the map's repaint do no
  O(geoids) work. `LevelPaint.packed` carries the packed classes to `MapView`.
- Not through the worker: timeline stops (classified on the main thread with the default view's
  breaks), comparisons and change maps. `classifyUnivariate` now makes one `Object.keys` pass, so the
  main-thread path is faster too.
- Why not move the values themselves only: deserializing a 240k-key object sent from a worker costs
  more (110–260 ms) than parsing the JSON. Strings and typed arrays cross almost free.

**Measured** (median of 5, ms on the main thread):

| | longest task | total |
| --- | --- | --- |
| Block groups, before | 457 | 601 |
| Block groups, after | 26 | 179 (spread over ~13 slices) |
| Tracts, before | 124 | 159 |
| Tracts, after | 10 | 41 |

Colors and expressions are identical (the bench checks every class and the full expression).

**Not checked here.** Real-browser frame pacing (agents have no Chromium); the e2e suite runs in CI.
