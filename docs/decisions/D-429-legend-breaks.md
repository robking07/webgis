# D-429 · Round class breaks; block groups share the tract breaks

- **Date:** 2026-10-21
- **Status:** DECIDED (lead), from the cartography audit (F5, F6, F11)
- **PR:** #329

**Rounding.** Quantile, equal-interval and Jenks breaks are rounded before anything uses them
(`niceBreaks` in `packages/design/src/classify.ts`). Each break gets the fewest significant figures,
2 or more, that keep the breaks in order and distinct, with the first above the data minimum and
the last at or below the maximum, so no class goes empty. $69,820 becomes $70,000; 9.31% becomes
9.3%. The map paints with the rounded breaks, so a place's colour always matches the legend row its
value falls in. The method stays a quantile; only the cut points move, by under ~5%. Manual breaks
are left as written. When the bottom class holds exactly the minimum (heavily skewed data), its
break stays exact, because the legend never shows it and rounding it could pull other values in.
Legends write dollars from $10K up as "$70K" unless two breaks would then read the same. The
timeline (D-36) still reuses the default view's breaks, now rounded.

**Per-level breaks, shared at neighbourhood scale.** States, counties and tracts keep their own
breaks (honest at each scale). Block groups take the tract breaks, since both are neighbourhood
scale; tracts load whenever block groups do. Puerto Rico stays in the national classes. When a zoom
switches the level and the key changes with it, the legend (card or phone strip) flashes once
(1.2 s, off under prefers-reduced-motion); the caption already names the level.

**No-data swatch.** Flat `--map-no-data`, like the map fill. Stripes in the legend now mean only the
reliability hatch (D-222).

Not done: change maps and bivariate maps keep per-level classes (change-map rounding is F7).
