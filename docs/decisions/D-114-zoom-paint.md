# D-114 · Zoom lag: color tracts and block groups by expression, not feature state

- **Date:** 2026-10-01
- **Status:** DECIDED (Robbie chose per-state layers, 2026-10-02)
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
- States and counties use a plain `match` on geoid.
- Tracts and block groups are drawn as **one fill layer per state** (52, plus one for any
  other prefix), each filtered by geoid prefix and carrying only that state's classes.
  Inside a layer the classes are packed into short strings, one per class and 4-digit
  geoid prefix, and tested with `in` (a native `indexOf`). The level's original
  `<level>-fill` layer stays, invisible, for hover and click hit-testing.
- How we got there:
  - A single `match` with all 240k ids halved the lag, but MapLibre copies the paint
    expression into every tile the workers send back. Unpacking it still blocked the main
    thread.
  - A single packed expression fixed the lag. The reviewer then found that every cached
    tile kept its own ~5 MB copy, so the heap reached ~400 MB after roaming. That's a
    risk on phones.
  - Robbie chose per-state layers over patching MapLibre (would need redoing on every
    upgrade) and over shipping as-is with a smaller tile cache.
- Prefix length: 2 (one string per state) took 13–35 µs per feature in the workers. 5 (one
  per county) made the expression slow to unpack. 4 costs 5–8 µs.
- Classifications are cached per loaded values object (`lib/values.ts`), so a level
  repaints only when its own data changes.

**Measured** (headless Chromium, software GL):
- Block-group branch, z10 ↔ z12: long tasks went from 18.9 s to ~0.1 s, and the longest
  dropped from 2.7 s to ≤0.16 s.
- Heap after 30 jumps around the Twin Cities at z12 (after GC): 416 MB with a single
  expression, 67 MB with per-state layers.
- `main`, county → tract (z7.5 ↔ z10.5): 7.1 s down to 0.15 s. At the 2019 year stop:
  5.3 s down to 0.
- First dataset switch while zoomed in: 7.1 s down to 0.2 s.
- 16 fixed views (tracts, block groups, bivariate, dark theme, year stops, counties,
  states) match the old rendering. The only differences are a few antialiased pixels
  along state lines, where neighboring areas now sit in different layers (invisible at
  5× zoom).
- In-app dataset, bivariate and theme switches match a fresh load of the same URL.
  Values arriving late over a throttled network end up identical too. Hover and
  selection survive the tract/block-group handoff as before.
- Frame pacing in the headless test browser is limited by software rendering. Real-GPU
  smoothness still needs Robbie's check.

**Not done.** The unmerged `data/block-groups` branch gets this when it merges `main`. Its
block level is colored from tile properties and isn't affected.
