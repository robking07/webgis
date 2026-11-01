# D-577 · "No clear change" is a visible light grey

- **Date:** 2026-11-01
- **Status:** DEFAULTED (worker, issue #474)
- **PR:** #477

The change ramp's middle class (`puor`, "No clear change") was a beige almost equal to the basemap's U.S. land, so steady tracts looked unpainted. It is now a light grey (`#c4c4c4`). The diverging check needs the middle to be the lightest class, so the two classes beside it were darkened a little, and the change map's no-data fill (`noDataChange`, light theme) went from `#b0ada5` to a pale `#f3f0e8`, lighter than the grey middle and close to unpainted land, so missing data recedes (map-first) and stays at least ΔE 10 from every class. `check:design` now also requires the middle class to be ΔE 10 from U.S. land in every vision simulation. The dark theme is unchanged.
