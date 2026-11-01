# D-564 · Neighbourhood colors fit the counties in view

- **Date:** 2026-10-31
- **Status:** DECIDED (lead + ponytail vote), issue #439
- **PR:** #464

Lead: fit to view past national zoom · Ponytail: county-based, neighbourhood levels only · Outcome: ponytail's version

**What changes.** On a one-dataset map at its default period, once the map shows tracts, block
groups or blocks, their color breaks are computed from every tract in the counties whose tracts
(or block groups, blocks) are on screen, with the dataset's own method and class count, rounded as
in D-429. Block groups take those same tract breaks (#325) and blocks follow the block groups. The
legend adds one line, "Colors fit the counties in view". Breaks follow whole counties, so small
pans inside a county don't move the colors; they update when the map stops moving and the county
list changes (MapView's `reportTractCounties`, now also run for these maps).

**What stays on U.S. breaks.** States and counties; change maps; two-map (bivariate) compare; the
year slider's non-default stops (they reuse the default view's U.S. breaks so stepping shows
change); compare-places maps and Specials' inline maps (they don't use the viewer's
classification); manual-break datasets; and any view with fewer than 5 × class-count tracts in its
counties.

**Known limits.**
- A shared link may show different breaks on different screens: a phone sees fewer counties than a
  monitor at the same zoom and center.
- Colors for the same tract differ between a neighbourhood view and the national view, by design;
  the legend line says so.
- The re-class runs on the main thread over all ~85k tracts (and ~240k block groups once loaded)
  each time the county list changes; see the PR for timings.

No toggle (not asked for).
