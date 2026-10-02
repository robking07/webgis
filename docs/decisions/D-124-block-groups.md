# D-124 · Block groups and blocks

- **Date:** 2026-10-01 (built), 2026-10-02 (shipped)
- **Status:** DECIDED (Robbie: "block groups, then blocks"; measures: population density, housing-unit density, share vacant) / DEFAULTED (details)
- **PR:** #24 (issue #21)
- **History:** first logged as D-39 in `docs/DECISIONS.md` on the unmerged branch `data/block-groups`
  (Robbie, 2026-10-01). That file is frozen now (D-112), so the decision moved here with this PR's number.

**Built** (on `data/block-groups`, then ported onto the map-page split from #23):

1. **New levels:** `block_group` (ACS and 2020 Census) and `block` (2020 Census only). Auto bands:
   tracts 8.5–11, block groups 11–13, blocks 13+.
2. **The database can't hold them** (~190 bytes/row; 242k block groups × 11 datasets ≈ 410 MB of a
   500 MB budget). Block-group values and MOEs are static JSON beside the tiles
   (`data/tiles/values/<id>/block_group[.moe].json`, ~5 MB each), published to R2 under
   `values/…`, gzip-encoded, by `npm run ingest -- publish-values`. They're not in git. Blocks carry
   their values as tile properties and are colored by a step expression with the block-group
   classes, so the legend holds across both. The details panel reads these files (block groups show
   a margin of error; blocks have none). There's no place profile or all-datasets list below tracts.
3. **ACS block groups** (`ingest acs-bg`, one call per state): 11 of the 12 ACS datasets that existed
   then. The Census Bureau doesn't publish B17001 (poverty), B08201 (vehicles) or B08013 (aggregate
   travel time) at block groups. The registry's `blockGroup` swaps in C17002 (people below the
   poverty line, same definition) and B25044 (owner and renter households with no vehicle). Mean
   commute has no block-group table and stops at tracts. ACS datasets keep tracts as the default
   (`defaultLevel: tract`, Robbie D-35); block groups are one click away and draw nationally.
   The 27 ACS datasets added since (D-113) still stop at tracts; see "Open" below.
4. **2020 Census** (`ingest census2020`): three datasets (Residents per square mile, Homes per square
   mile, Share of homes vacant). P.L. 94-171 block counts (P1_001N, H1_001N, H1_003N; one API call per
   state) are joined to TIGER/Line 2020 blocks (ALAND20) and summed up to block group, tract, county
   and state, so every level adds up. Connecticut's 2020 blocks are re-keyed to planning-region tracts
   through `ct_xwalk`. Default level: block groups (Robbie); blocks are selectable at any zoom. State
   and county values are in the database; tracts are in the static files (D-113). A new glossary term,
   `decennial-census`, explains the privacy noise in block counts.
5. **Tiles:** block groups 192 MB (z2–12, no dropping). Blocks: z2–13, thinned at low zoom where
   they'd be sub-pixel, from all 8,174,955 2020 blocks. The first national block build was cut off
   (a 5 MB file with a leftover `-journal`); tippecanoe now writes its temp files to
   `data/cache/tippecanoe-tmp` instead of `/tmp`, which is a small tmpfs here. Source downloads:
   52 block shapefiles, ~9.7 GB in `data/cache`.
6. Blocks can't be compared (a bivariate map needs a join).
7. **Smoothness (D-114):** tracts and block groups keep the per-state expression layers. Blocks use
   one step expression on a tile property, so they need no feature state either.

**Port notes (2026-10-02).** The branch's `Viewer.tsx` edits now live in `map-page/useViewerData`
(lazy levels, block paint), `DetailPanel` (static values and MOEs below tracts), `HoverPopups`
(block values from the tile), `DisplayOptions` (the "coming" note is gone; the default level is
marked "(default)") and `MapLegend` (the table falls back to counties below counties).

**Open (Robbie's call).** Block groups for the 27 ACS datasets from D-113. The API publishes 25 of
them at block-group level (gini index and foreign-born stop at tracts). Cost: about 10 MB of R2 per
dataset and one ingest run.
