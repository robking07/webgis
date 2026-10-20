# D-316 · Base map: light land and water outside the US, and route shields

- **Date:** 2026-10-14
- **Status:** DECIDED (Robbie, colors) / DEFAULTED (worker, details)
- **PR:** #216 (issue #201)

**Robbie's call (2026-10-14):** outside the US the base map should look like a regular map:
soft blue water and pale land in light mode, a softer gray version in dark mode, so it reads as a
map without glaring next to the dark panels. Choropleths keep contrast against both. The site keeps
following the visitor's system theme.

**Colors** (`packages/design/src/themes.ts`, `map.*`):

| Token | Light (was) | Dark (was) |
| --- | --- | --- |
| `background` / `land` (outside the US) | `#e5e2d6` (`#e6e3dc`) | `#3a3e45` (`#141619`) |
| `water` | `#abc9e3` (`#b9cee0`) | `#1d3248` (`#0a1824`) |
| `waterLine` | `#9dbcd8` | `#2c4a66` |
| `coastline` | unchanged | `#3d6a8e` |
| `park`, `road`, `roadMajor` | unchanged | `#39443d`, `#42464e`, `#4c5058` (so they read on the lighter gray) |
| `countryHalo` | unchanged | `#1d3248` (still matches water, as before) |

US land (`focusLand`) is unchanged in both themes. In dark mode the US is now a step darker than
the land around it; the colored data still carries the figure-ground.

**Route shields (defaults):** Interstate shields from z7 and US-route shields from z8, placed
along the line, above the data. Before z7 Interstates keep the plain "I-25" text (z6 to z7).
State routes get no shields (not asked). Refs longer than 3 characters get no shield (the sprite
has no wider image).

- **Source:** OpenFreeMap's sprite, `https://tiles.openfreemap.org/sprites/ofm_f384/ofm`
  (`us-interstate_1..3`, `us-highway_1..3`), the same CDN as our tiles and glyphs, CORS open.
- **License:** the sprite comes from OSM Liberty (OpenFreeMap styles repo, MIT); OSM Liberty's
  design is CC BY 4.0, derived from OSM Bright / OpenMapTiles. Attribution is covered by the
  existing "OpenFreeMap © OpenMapTiles, OpenStreetMap" credit.
- The shields are white with a dark outline (the Interstate one has a slate band on top), not
  the red-white-blue Interstate colors. Drawing our own accurate shields is a possible follow-up.

**Checks added** (`packages/design/scripts/check.ts` and `CONTRAST_RULES`): every sequential class
stays ΔE ≥ 10 from land outside the US; land vs water ΔE ≥ 8; national boundary vs outside land
3:1; shoreline vs outside land 1.5:1; route number on its shield 4.5:1 (new token `shieldFill`,
the sprite's white).

**Merge with main (2026-10-19):** kept main's drill-down `focusDim` token unchanged (dark
`#141619`, the old dark background). It washes only US polygons outside the focused place, so in
dark mode those now dim darker than the gray land outside the US; the dimmed-class check passes.
