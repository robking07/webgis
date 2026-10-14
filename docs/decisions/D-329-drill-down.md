# D-329 · Click to drill down: a click focuses a place and draws its parts

- **Date:** 2026-10-14
- **Status:** DECIDED (Robbie, 2026-10-13/14) with defaults noted below
- **PR:** #229 (issue #203)

Clicking a place that has a finer level on the current map focuses it: the map fits the whole
place, every other place at its level sits under a dim wash (`map.focusDim`, `FOCUS_DIM` in
`packages/design`, checked by `check:design`), and only the next level down is drawn, inside it
(state → counties, county → tracts, tract → block groups). The focus overrides switch-with-zoom
and a level fixed in Map options (Robbie). The focused place is in the URL as `in=<geoid>`, and
each drill is one browser-history step, so Back steps out one level at a time. At the dataset's
finest level a click only selects, without zooming further, and the details say "the finest
level on this map" (feature-fit rule).

Defaults taken (Robbie's to change):

- Focusing goes full screen, where the place's name shows larger under the dataset heading, with
  an × that returns to the whole map.
- A click outside the focused place does nothing; Back, the ×, Esc or the details' trail leave it.
- Switching to a dataset that can't drill at the focused level shows the whole map again, but the
  `in=` stays in the URL until Back.
