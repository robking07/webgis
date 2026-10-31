# D-559 · Pick an area: tap tracts, see their totals

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker, from the lead + ponytail plan in drafts/planner-depth-plan.md §D)
- **PR:** #459 (issue #455)

For corridor and station-area studies: on any map with tracts, a "Pick tracts" button (the map's
right-hand button column, under Go to, Back and Near me) starts picking. Each tap adds or removes a
tract, outlined with the selection outline (a `picked` feature-state flag in `packages/design`
`thematicLayers`). A bar reads "N tracts picked · Done · Clear"; Esc or Done stops picking.

- **Math:** none new. The picked 11-digit geoids go through `placeCounts` + `sumCounts`
  (`lib/counts.ts`), as an MPO's tracts do (#292, #390). The rows are RegionTotal's, factored into
  `TotalRow`, looped over the map(s) on screen, so compare-two-maps gets both totals. Maps with no
  published counts (medians, indexes) say they can't be added up across tracts.
- **Clicks:** while picking, `MapView` sends a tract click to `onPick` instead of `onSelect`, with no
  double-click fit (D-418) and no double-click zoom. Clicks on a county (zoomed out) do nothing.
- **Button:** shown on maps with a tract level, greyed above tract zoom ("Zoom in to tracts to pick
  them"); it stays usable while picking, to stop.
- **Defaults taken:** after Done the total and outlines stay until Clear (the button picks more), so the
  number can be read and cited; alternative was Done = clear. Cap 50 tracts; a tap past it shows
  "50 tracts picked, the most allowed". The bar sits bottom left of center (right of the legend) on
  laptops and full width just above the legend strip on phones (the expanded legend folds to its
  strip, and the zoomed-in search button above the strip steps aside), leaving the right-hand buttons
  clear; it hides while a place's details sheet is open on a phone. The picks survive a map switch while the new map has tracts.
- **Not in v1:** sharing the area by URL, buffers, lasso, block groups or counties.
- shortcut: on a timeline stop drawn on 2010 tracts, picks are 2010 geoids and the 2020 counts don't
  have them, so the total says a tract's numbers are missing.
