# D-222 · Reliability warnings

- **Date:** 2026-10-07
- **Status:** DECIDED (Robbie, the three product questions); DEFAULTED (worker, the technical choices below)
- **PR:** #122 (issue #97, roadmap 1.3)

**Problem.** Most Mapwich numbers are ACS 5-year survey estimates with margins of error. The details
panel showed "±" next to a value, but the map colored a tract with a shaky estimate exactly like a
solid one, so planners comparing small areas couldn't tell when a difference is noise.

**Decided (Robbie).** Light diagonal hatching over unreliable areas, with a legend entry, and the
fill color still shows. Off when a map opens, with a toggle. Standard ACS cut-offs by coefficient
of variation: under 15% reliable; 15–30% "use with caution" (details-panel note only, never
hatched); over 30% unreliable (hatched when the toggle is on, and a details-panel note).

**Defaults taken (worker).**

1. **CV formula:** CV = (MOE / 1.645) / |value| × 100, the Census Bureau's standard (ACS margins are
   at 90% confidence). An unreliable estimate (CV over 30%) has a margin of about half the value or
   more; the plain-words notes say that. Grading lives in `packages/design/src/reliability.ts`.
2. **Not graded:** a value of 0 or null (CV is undefined), and a missing margin. No hatch, no note.
   A margin of exactly 0 grades reliable.
3. **Only `measure.kind === "acs5"` is graded.** CDC PLACES' "±" is a 95% interval, not an ACS
   margin; 2020 Census counts, LODES, CEJST and the rest have none. Those maps show no toggle.
4. **Computed in the browser from files already published** (no upload, no ingest change). Tracts:
   the per-county shards `values/tracts/<county>.json` (the same files the details panel reads),
   loaded only for counties whose tracts are on screen, and only while the toggle is on. Block
   groups: `values/<id>/block_group.moe.json` with the dataset's block-group values, loaded only
   with the toggle on at block-group zoom. With the toggle off (the default) nothing extra loads.
   The shard values match `values/<id>/tract.json` (checked for median household income in
   Hennepin County: 325 of 329 equal, the other 4 have no value), so the margins are the headline
   vintage.
5. **Where it applies.** The toggle shows in the full legend only for one ACS dataset (not a
   comparison), at the default period (timeline stops have no margins on R2, so the toggle hides
   rather than grade the wrong vintage), at tract or block-group level. Counties and states are not
   hatched (they rarely trip the threshold) but their panel notes are graded.
6. **Panel notes** show under the dataset's value whenever the place's estimate is "use with
   caution" or unreliable, whether or not the toggle is on. A timeline stop's value has no margin
   and gets no note.
7. **Hatching symbology** (tokens only): `map.hatchDark` and `map.hatchLight` per theme, and
   `HATCH` (spacing 7 px, stripe width 1.25 px, opacity 60%) in `themes.ts`. A dark and a light
   stripe side by side, so the hatch reads over the palest and darkest classes; the design gate
   checks every class of every area ramp and the no-data fill. The pattern is built in code from
   the tokens (`hatchImage`) and added with `map.addImage`; one `fill-pattern` layer per level
   (`tract-hatch`, `block_group-hatch`) sits above the fills, filtered to the unreliable geoids with
   the same packed-string membership test as the per-state fills (D-114).
8. **The toggle isn't in the URL.** Robbie asked for off when a map opens; a shared link opens
   without hatching. It stays on while the visitor switches datasets in the same visit.

## Amendments

- Amended 2026-10-06 (Robbie): hatching with legend entry, color shows; off by default with a toggle; CV cut-offs 15% / 30%.
