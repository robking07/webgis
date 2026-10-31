# D-558 · Line feature layers also draw their point features as dots

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker; the lead confirms)
- **PR:** #458, issue #450

The TIP data has 268 line projects and 129 point projects (bridges, stops, signals). D-546 showed only the lines. Now:

- **One layer, mixed geometry.** The registry entry matches both source layers (`^TIPfinal(Line|Point)$`); the ingest already reads every matching layer into one PMTiles. `featureLineLayers` (packages/design) adds a `<id>-point` circle layer, filtered to Point/MultiPoint (`POINT_FEATURES`), colored by the same ramp and breaks as the lines, sized by the existing `SIZE.point` and `SIZE.pointStroke` tokens, with the line casing color as its outline. The registry `geometry` stays `line`. Rejected: a second dataset for the points, because it would split the legend count and the filters.
- **Click, hover and filters** query and filter the line and point layers together. The facet filter keeps the points-only clause.
- **Tippecanoe `-r1`** on line/point layers: by default tippecanoe thins points below its max zoom, which left 13 of 129 dots at zoom 10. Lines are unaffected, so AADT's tiles don't change.
- **New facet value** "EV charging" for the one point project of type "Electronic vehicle/Charging infrastructure". Without it, any type filter would hide that project.
- AADT has no points, so its new circle layer draws nothing.
- The legend still shows line swatches. The dots use the same colors, so the legend needs no second key.
