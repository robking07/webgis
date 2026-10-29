# D-513 · Map labels by importance, streets at city zoom, darker county lines

PR #413, closes #410, refs #187 (cartography audit F3, F4, F13). Style-only (`packages/design`):
no new tiles, no data changes. Amends D-508 (county line color) and D-316 (label order).

## Decision

- **County lines (light only):** `map.boundary` `#a39f97` → `#7f7b74`, so Hennepin/Ramsey read
  over white tract outlines; still thinner than the cased state line. Dark unchanged.
- **Places** (`label-place`, from z3): before z6 only U.S. cities with OpenMapTiles `rank` ≤ 3
  (`LABEL.majorCityRank`: Seattle, St. Louis, Atlanta, Minneapolis; not Minot or Elko, rank 5);
  every city from z6; towns from z8. Size by importance (`LABEL.sizes.placeByRank`): big city >
  city > town at every zoom, so Minneapolis > Saint Paul > the suburbs. Cities may sit just above
  or below their point (`text-variable-anchor`) instead of dropping out.
- **Label order** (later wins a collision): water, street names, neighbourhoods, route shields,
  state names, places. So a city beats its state's name and a shield (Saint Paul among 35E and 94).
  At the national view a few state names give way to their big city (Washington, Missouri).
- **Streets:** `overlay-arterial` (trunk, primary, secondary) from z10.5, over the data under the
  interstates: `map.arterial` (white both themes) at `ARTERIAL_OPACITY` (0.75 light, 0.35 dark),
  `SIZE.arterial`. Street names (`label-road`) from z13, neighbourhood names (suburb, quarter,
  neighbourhood; uppercase, muted) from z12.
- **Halos:** the `map.labelHalo` token stays opaque (the contrast checks use it); the style draws
  it at `LABEL.haloOpacity` 0.85, width 1.3, blur 0.3, so it no longer cuts a hard white block
  out of the darkest classes.

## Not done

- Kansas City at the national view: OpenFreeMap's tiles carry it only from z6 (rank 8), so no
  style can label it at z3–5. It would need our own city-label source.
- Phones' national view (about z2.5) still shows no city names (as before).
- Audit F14 (interstates at the national zoom), bold type for the biggest cities, retiring the
  under-data `road-*` layers.
