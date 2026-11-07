# D-641 · Change maps: series breaks, Connecticut note, BEA combined areas

- **Date:** 2026-11-03
- **Status:** DEFAULTED (worker, issue #540)
- **PR:** #541

- **Series breaks.** A timeline stop can carry `series` (registry `timeline.ts`). A change map only
  pairs stops whose `series` matches (`changeStops`). Today only popest's 2011–2019 stops set it
  (`"2010"`: estimates built on the 2010 Census), so the three popest rate maps offer no pair across
  2019 → 2021. No registry YAML field: the break follows from the measure kind, like `boundaries`.
  The To picker lists every stop that has an earlier one in its series (2012–2019 and 2022–2025),
  and picking a To in the other series starts From at that series' oldest year.
- **Connecticut note.** The change legend and the card name the From period that keeps
  Connecticut's old counties ("Connecticut shows no data (2022 uses its old counties)") instead of
  a fixed "changed in 2022". This holds for every source, whatever year it switched.
- **Manual breaks.** The legend's "bottom class is exactly the minimum" label is only for computed
  breaks; manual breaks always show their own labels.
- **BEA combined areas.** `BEA_GROUPS` moved from the ingest to `@webgis/registry/bea-groups`, so
  the ingest and the card read one table. The card adds "Figure for Fairfax County with Fairfax city
  and Falls Church city" on each member.
