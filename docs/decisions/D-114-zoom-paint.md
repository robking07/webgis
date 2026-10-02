# D-114 · Zoom lag: color tracts and block groups by expression, not feature state

- **Date:** 2026-10-01
- **Status:** DEFAULTED (Claude; Robbie asked for the lag to be fixed)
- **PR:** #14

**Problem.** Robbie saw major lag when zooming, worst crossing from tracts into block
groups. Profiling a headless zoom (z10 ↔ z12, three passes over Minneapolis) found ~19 s
of main-thread long tasks, with single stalls up to 2.7 s. The map colored tracts and
block groups through feature state, one entry per geoid (~85k tracts, ~240k block
groups). MapLibre copies a source's whole feature-state map into every tile it loads and
then searches each entry per bucket, so each new tile cost O(all geoids). The class maps
were also rebuilt whenever any level's values arrived, which re-sent every state again.

**Built.**
- Fill colors are one data-driven expression per level, evaluated in the tile workers
  (`choroplethFill` in `packages/design/src/style.ts`). Feature state holds only hover
  and selection, and a cleared hover is removed instead of being set to false.
- States and counties use a plain `match` on geoid. Tracts and block groups use a packed
  lookup. A plain `match` with 240k ids was tried first and halved the cost, but MapLibre
  copies the paint expression into every tile result the workers post back, and unpacking
  it still blocked the main thread. The classes are packed into short strings instead,
  one per class and 4-digit geoid prefix (state plus two county digits), and tested with
  `in` (a native `indexOf`). A prefix of 2 (one string per state) was cheapest for the main
  thread but took 13–35 µs per feature in the workers. A prefix of 5 (one per county) made
  the expression big enough to slow unpacking again. A prefix of 4 costs 5–8 µs per feature.
- Classifications are cached per loaded values object (`lib/values.ts`), so a level
  repaints only when its own data changes.

**Measured** (headless Chromium, software GL):
- Block-group branch, z10 ↔ z12: long tasks went from 18.9 s to 0.07–0.25 s, and the
  longest dropped from 2.7 s to ≤0.16 s.
- `main`, county → tract (z7.5 ↔ z10.5): 7.1 s down to 0.15 s. At the 2019 year stop:
  5.3 s down to 0.
- First dataset switch while zoomed in: 7.1 s down to 0.2 s.
- 16 fixed views (tracts, block groups, bivariate, dark theme, year stops, counties,
  states) are pixel-identical to the old rendering. In-app dataset, bivariate and theme
  switches match a fresh load of the same URL. Values arriving late over a throttled
  network end up identical too. Hover and selection survive the tract/block-group
  handoff as before.
- Frame pacing in the headless test browser is limited by software rendering. Real-GPU
  smoothness still needs Robbie's check.

**Not done.** The unmerged `data/block-groups` branch gets this when it merges `main`. Its
block level is colored from tile properties and isn't affected.
