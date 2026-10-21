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
| `water` | `#c0e7e8` (`#b9cee0`) | `#182b38` (`#0a1824`) |
| `waterLine` | `#a6d6d8` | `#274456` |
| `coastline` | unchanged | `#3d6a8e` |
| `park`, `road`, `roadMajor` | unchanged | `#39443d`, `#42464e`, `#4c5058` (so they read on the lighter gray) |
| `countryHalo` | unchanged | `#182b38` (still matches water, as before) |

US land (`focusLand`) is unchanged in both themes. In dark mode the US is now a step darker than
the land around it; the colored data still carries the figure-ground.

**Route shields (defaults):** Interstate shields from z7 and US-route shields from z8, placed
along the line, above the data. Before z7 Interstates keep the plain "I-25" text (z6 to z7). That text only shows plain refs (no space), so a way that carries
an Interstate relation but a ref like "US 90 BUS" no longer reads "I-US 90 BUS".
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
stays ΔE ≥ 10 from land and from water outside the US; land vs water ΔE ≥ 8; national boundary vs outside land
3:1; shoreline vs outside land 1.5:1; route number on its shield 4.5:1 (new token `shieldFill`,
the sprite's white).

**Merge with main (2026-10-19):** kept main's drill-down `focusDim` token unchanged (dark
`#141619`, the old dark background). It washes only US polygons outside the focused place, so in
dark mode those now dim darker than the gray land outside the US; the dimmed-class check passes.

**Water vs classes (2026-10-21, cartography audit F8):** `check:design` now also keeps every
sequential class ΔE ≥ 10 from `water` in both themes. The first water colours failed it: the
light soft blue (`#abc9e3`) sat ΔE 4.5–6.8 from the pale Blues classes (24 of 139 maps use Blues),
and the dark `#1d3248` sat ΔE 7.4–9.6 from the darkest Blues, Cividis and YlGnBu classes. No plain
blue passes in light (Blues spans every blue lightness), so light water is now a soft aqua
`#c0e7e8`, in the same family as OpenStreetMap's water; dark water is a slightly deeper,
grayer blue `#182b38`. The ramps are unchanged. Robbie asked for "soft blue"; the aqua is the
nearest colour that passes, so the light water tint is open for his review.
