# D-508: Water and parent boundaries drawn over the data

PR #408, refs #187 (cartography audit F1, F2). Style-only: no new tiles, no data changes.

## Decision

Census cb polygons are not clipped to inland lakes, and the data fill hid state and county lines.
Layer order, bottom to top, around the data:

1. Basemap land, `water`, roads, `boundary-*` (unchanged)
2. Thematic fills and outlines (inserted before `DATA_BEFORE_ID` = `overlay-water`)
3. Selection outlines (before `HIGHLIGHT_BEFORE_ID` = `ref-county-line`)
4. `overlay-water`, `overlay-shoreline` (OpenMapTiles water, same tokens as the basemap)
5. `ref-county-line`: core `map.boundary`, opacity 0.8, 0.4 px at z6, 0.6 at z9, 1.2 at z14, no casing
6. `ref-state-line-casing`: `map.featureOutline`, opacity 0.8, 1.4 px at z3, 2.5 at z5, 4 at z10
7. `ref-state-line`: core `map.boundaryMajor`, 0.5 px at z3, 0.9 at z5, 1.6 at z10
8. Rivers, interstates, labels (unchanged)

The reference lines use the Census `b-state` / `b-county` sources, so they match the fills.
Feature (AADT) lines still go before `label-water`, above the water, so bridges still cross.
The CEJST per-layer water mask is gone: `overlay-water` does that job.

Dark `boundaryMajor` went from `#6b707a` to `#8b919c` (reads over navy and the dark ramps).
New design-check row: state line core vs its casing, 3:1.

## Not done

- Class-by-class 3:1 contrast check of the state line against every ramp (audit suggestion).
- Retiring the basemap `boundary-state` dashed line (still there under the data, harmless).
- Reference lines ignore `bandShift` (state from z3, county from z6 on every screen).
