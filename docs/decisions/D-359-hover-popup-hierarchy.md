# D-359 · One hierarchy for every hover popup

- **Date:** 2026-10-20
- **Status:** DECIDED (lead, 2026-10-19; Robbie delegated the design calls to the lead)
- **PR:** #259 (issue #236). Follows #232's change popup; one follow-up from #200.

**Problem.** Hover popups each laid out their numbers differently: the period sat in the subtitle
or nowhere, the value was row-sized next to a bigger place name, and on a narrow window (390 px)
the card ran off the right edge ("perce…").

**Decided.** The key number is the biggest line, with its period right under it; the place name
(a semibold title) and its level sit smaller on top. The card flips to the pointer's left, or
above it, when it would run past the map's right or bottom edge.

1. **One map:** the value leads, period under it ("2020–2024", short form of the vintage or year
   stop). "No data" leads smaller and muted. Road segments and other features lead with the mapped
   field and the dataset's period, then one more field.
2. **Comparing two maps:** two equal rows, each value with its own period under it.
3. **Shaky estimates:** while hatching is on, a hatched area adds one muted line: "Rough estimate:
   the margin of error is about half the value or more." (a zero: "…is large for a zero.", D-364).
   Nothing is added while hatching is off; the margins only load then.
4. **Long headlines** ("9.9K vehicles/day" on a phone): kept as prototyped, wrapping within 16rem.
5. **Environmental justice (CEJST):** the period reads **"Dec. 2024"**, not "Version 2.0": a
   vintage written "Version X (date)" shows its date.
6. **Change map hover only (#200):** on percentage-point changes, the From and To values show one
   decimal ("12.8% → 12.3%") so they visibly add up to the change ("−0.5 pts"). Every other hover,
   and the details panel, keep their current rounding.
