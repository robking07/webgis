# D-133 · Map levels switch with zoom; no block groups at national zoom; menus don't overlap

- **Date:** 2026-10-02
- **Status:** DECIDED (Robbie: switch with zoom by default, no block groups or blocks at national or
  multi-state zoom) / DEFAULTED (bands, pinned behavior, overlap rules: worker for the project lead)
- **PR:** #33 (issue #32)
- **Changes:** D-35 (5), "default level = the dataset's finest level, drawn at every zoom"

**Robbie (2026-10-02):** "After testing we need to disallow block group and block from appearing at
the national or multi state level. Default the first map on national view to state level metrics.
Also there is a lot of overlapping menus." Decided with the lead: **"Switch with zoom" is the default
for every dataset.** A visitor can still pin a level in Display options, but block groups and blocks
never draw at national or multi-state zoom, even when pinned.

## Zoom bands

Bands live in `packages/design/src/sizing.ts` (`GEO_LEVELS`), tuned for a map 1440 px across:

| Level | Switch with zoom | Never below (pinned) |
|---|---|---|
| State | 0 – 4.6 | – |
| County | 4.6 – 8.5 | – |
| Census tract | 8.5 – 11 | – |
| Block group | 11 – 13 | 7 |
| Block (2020 Census only) | 13 – max | 7 |

**Bands follow the screen.** A 1440 px desktop fits the lower 48 at about z4.1; a 390 px phone fits
them at about z2.1. One set of zoom numbers can't put states on both national views and counties on a
phone's multi-state view, so `bandShift(width, height)` moves every band by
log2(map width / 1440), in quarter zooms, clamped to −2…+1. The width used is
min(width, 1.8 × height), the lower 48's aspect. On a phone (shift −2) states run to z2.6, counties
to 6.5, tracts to 9, block groups to 11, then blocks. Each level covers about the same ground on any
screen. A 1920 px monitor shifts +0.5 (fit z4.5, states to 5.1).

Checked headless: phone and desktop landings open on states. Phone Upper Midwest (z3.9) shows
counties, Minneapolis (z8) tracts, downtown (z10) block groups.

## Pinned levels

- `lv=<level>` pins that level at every zoom, as before, except for block groups and blocks below
  their floor (z7 on a 1440 px map, shifted like the bands; about one large state across). Below it,
  the finest coarser level without a floor stands in (tracts).
- While the stand-in shows, the selected chip reads **"Block group (zoom in)"** and the note says
  "Block groups show once you zoom in closer than a few states. Showing census tracts until then."
  The card's level line and the immersed chip name the level actually drawn.
- `lv=auto` (the old spelling) is accepted and means the default. Picking "Switch with zoom" clears
  `lv` from the URL.
- Specials maps are county-only and are unaffected: a single level always gets the whole zoom range.

## `defaultLevel` removed

The registry's `defaultLevel` (tract for 33 ACS entries, block group for the three 2020 Census
entries) only chose which level drew at every zoom. With switch-with-zoom as the default it means
nothing, so it is gone from the schema, the YAML and `generated/registry.json`. The picker lists
"Switch with zoom" first. The "(default)" marker is gone, and the note explains what switching does.

## Clicks follow the bands

Clicking a place zooms to its extent (D-35), which now usually steps one level finer. A clicked state
frames that state's counties, and a clicked county frames its tracts. The clicked place stays
outlined and its details panel shows its own value. This is left as is: it's the "dig in" behavior
of the map-first rules. **For Robbie:** if he'd rather a click keep the clicked level, the fit can
stop at that level's band.

## Menus and panels (the overlap rules)

- **One layer of halo'd text at a time.** The immersed dock (geography level and filters) has no
  backing, so it hides while the category or dataset menu is open and comes back when it closes.
  Opening the dock closes the menu.
- **Open menus sit on top.** While a heading menu is open, the heading rises above every other map
  panel (legend, controls, details), so the solid menu covers them instead of sliding under.
- **The selected level chip is always solid** (`bg-primary` / `text-primary-foreground`). In the dock
  it was blank because `.wg-glass` is unlayered CSS and overrode the Tailwind fill, leaving
  white-on-glass text.
- Plurals come from the token (`GEO_LEVELS[level].plural`): the chip read "Countys".
- A fitted first view now reports its real zoom, so the level named in the card matches the map
  (phones said "County" over a map of states).
- The full audit at 360–1440 px (light and dark, at rest and immersed) is in the PR description.

**Later (proposal only, for Robbie's review):** how menus should respond to screen size and to
interaction (at rest → interacting → after a selection → digging in). Mockups are with the project
lead; nothing is built yet.
