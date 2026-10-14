# D-330 · Compare places: a map per place (PR 2c)

- **Date:** 2026-10-14
- **Status:** DEFAULTED (worker, issue #117 part 2c; Robbie's video note of 2026-10-13)
- **PR:** #230. Amends D-258 PR 2a (one shared map, laptops only).

**Robbie (2026-10-13):** with a far-away pair (Hennepin vs Cherry County, NE) the one map zooms out
and the dashed second outline is easy to miss. Two maps side by side on large screens, tabs on small
screens; design for Alaska and Hawaii.

## Decided

1. **One map per place**, each framed on its own place (rough box from its center and land area,
   then its real outline once tiles are in; `MapView`'s `compare.fit`). Both places stay outlined on
   both maps (A solid, B dashed), so a neighboring pair still shows how they sit together. Each map
   is labelled with its place's name and its line style (this replaces the two-line key).
2. **Laptops and monitors (lg):** the two maps side by side beside the panel, sticky, full height.
   One legend, on the first map (`SpecialMap legend={false}` on the second); both use the same classes.
3. **Phones and tablets (below lg):** one map under the headline (60% of the screen height) with two
   tabs named for the places (the house pill-tab style from the pairing review). Switching tabs mounts
   the other place's map. This reverses D-258 2a.4 (no map on phones): phones now load MapLibre, the
   tiles and the metric's national values file for the level (county ≈15 KB gzipped; tract ≈440 KB,
   over Part 1's ≈600 KB budget for tract pairs: a `shortcut:` in `ComparePlaces.tsx`).
4. **Alaska and the antimeridian:** outline extents (`geometryBbox` in `MapView.tsx`) treat any
   longitude east of 0° as west of 180° (lon − 360). Every U.S. place is west of 0°, so this only moves
   the Aleutians past 180° next to the rest of Alaska; a fit never spans the world. The same fix applies
   to fitting a place from the main map.
