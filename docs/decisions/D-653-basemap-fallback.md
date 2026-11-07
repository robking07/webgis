# D-653 · Backup basemap if OpenFreeMap fails

PR #553, closes #552 (roadmap S4). Kind: perf/resilience.

## Decision

- OpenFreeMap stays the basemap. If its tilejson or a tile errors before any basemap tile has arrived
  (or 3 errors after), or no basemap tile has arrived after 10 s, the map switches (once per visit) to
  `basemapStyle(theme, true)`: the same layer ids over an empty source, a water-coloured background, and
  our own state tiles on R2 for U.S. land and state lines (`us-focus-land`, `ref-state-line`). No glyph or
  sprite URLs, so nothing else is fetched.
- **Costs nothing:** no new file, no new R2 object. Full self-hosting of a basemap was dropped
  (lead + independent ponytail vote); revisit only if OpenFreeMap actually fails or goes away.
- **Credits:** the OpenFreeMap / OpenMapTiles / OpenStreetMap part of the footnote is dropped in backup mode
  (none of that data is on screen); the Census credit stays.
- **Known limits** (`shortcut:` in `style.ts`): Canada and Mexico read as water; no roads, rivers, labels
  or neighbour countries; the switch lasts until reload.
- D-316 / D-513 styling is untouched; with OpenFreeMap working nothing changes.
- Test: `e2e/basemap.tests.mjs` aborts `tiles.openfreemap.org` and checks land, data and credits.
