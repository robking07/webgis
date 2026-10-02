# Roadmap: digging deeper without clutter

The guiding rule (D-25, D-26): **the landing map is clean and authoritative; every user action unearths the next layer of options.** Nothing appears until the user's last action makes it relevant.

## The progressive-disclosure ladder

| User action | What appears | Status |
|---|---|---|
| Lands on the map | The map, one factual dataset card, legend | ✓ |
| Pans/zooms | Chrome falls away; the map is everything | ✓ |
| Opens ⓘ / Display options | Explainers; geography level; filters for the layer | ✓ (this pass) |
| Hovers / clicks a place | Its value and rank; then the full place profile | ✓ |
| Opens the table | Every place, sortable; click to fly there | ✓ |
| Picks a comparison | Bivariate map + legend | ✓ (desktop card) |
| Picks a finer level | Block groups (ACS + 2020 Census), blocks (2020 Census) | ✓ (D-124) |
| Starts from a place | A place-first page | Planned, below |

## Finer geography: block groups and blocks (D-27; built in D-124)

> **Built 2026-10-01 (D-124; first logged as D-39 on an unmerged branch).** What changed from this plan: block-group values live in static files beside the tiles (R2), not the database; blocks carry values in their tiles; the 2020 Census datasets are built from blocks up. The notes below are the original plan.

- **Block groups** (~240k): ACS 5-year publishes most tables at block-group level. Work: Gazetteer has no block groups, so land area and internal points come from the TIGER BG shapefiles; boundaries are `cb_<year>_<st>_bg_500k` per state (or TIGER BG national); values ≈ 240k rows × N datasets, so the 500 MB database budget needs checking (store BG values in static exports only, or a separate table without MOE).
- **Blocks** (~8M): only 2020 Census counts (population, housing units), not ACS. Tiles only at high zoom; values would live only in tiles (a different pattern from feature state). Probably limited to a handful of decennial measures.
- **Tiles:** BG tiles from z9; block tiles from z12, built per state.
- **UI:** the existing "Geography level" control gains Block group (and Block for decennial datasets); Auto extends the zoom bands.
- **Other datasets on Census geography:** CDC PLACES publishes tracts (2020 tracts in recent releases); LODES aggregates to block groups and blocks directly; FARS/NBI/HPMS roll-ups can be recomputed at tract level from points/segments.

## Place-first entry (planned)

Like Data USA's "search a place", but **not an avalanche**:

1. **Entry:** a single search box on the landing map ("Search a place or a dataset"), with no forced choice; the map is still the default.
2. **Selecting a place** flies the map there, outlines it, and opens a compact place card: name, population, and **three to five headline numbers** chosen by what's unusual about this place (largest percentile gaps from the national median), each with its rank line ("Ranks higher than 92% of counties").
3. **One action per number:** "Map it" (switches the dataset), "Compare" (bivariate), "See all data" (the existing `/place/<geoid>` profile with the filter).
4. **Places index:** `/places` lists states → counties → tracts with the same filter, for browsing without a map.
5. **Data needed:** a search index of names (states, counties, places/cities, ZCTAs later) with coordinates, built at export time (`geo/places.json` is the start); "what's unusual" scores computed at export from the static values.

## Not yet decided

- Editorial style for the Insights section (A/B/C concepts are campaign material).
- Navigation model across Map / Data / Insights / Places (Robbie to lead).
