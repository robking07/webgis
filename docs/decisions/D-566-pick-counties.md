# D-566 · Pick an area: counties too

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker, from the lead's design on issue #391)
- **PR:** #466 (issue #391)

Extends the tract picker (D-559) instead of adding a second one. The "Pick tracts" button is now
"Pick an area" and picks at the level being drawn: zoomed out to counties, taps pick counties; zoomed
in to tracts, taps pick tracts. It is greyed only when neither is drawn (states): "Zoom in to counties
or tracts to pick them". It shows on maps with a county or tract level.

- **One level per pick set** (mixing would count people twice). The first pick sets the level; the
  level is read from the geoids (5 digits county, 11 tract), so there's no extra state. While picking
  with the other level drawn, taps do nothing and the bar reads "Picking counties · Clear to pick
  tracts" (or the reverse). Otherwise "N counties picked · Done · Clear".
- **Math:** none new. County geoids go through `placeCounts` + `sumCounts` (`lib/counts.ts`) and
  `TotalRow`, as tract picks and MPO totals do; compare-two-maps and the "can't be added up across
  counties" note come with it. The footnote says "The sum of N counties" (tracts keep "2020 census").
- **Outline:** the same `picked` feature-state, set on `b-county` for county picks.
- **Kept from D-559:** cap 50, Esc/Done, picks stay after Done until Clear, bar position. Picks
  survive a map switch while the new map has their level; otherwise button and bar hide until a map
  that does.
- **Not in this change:** URL sharing, lasso, block groups, states.
