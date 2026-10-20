# D-364 · Zero estimates with big margins, and why a place has no value

- **Date:** 2026-10-17
- **Status:** DECIDED (Robbie, 2026-10-16: the treatment); DEFAULTED (worker for the lead: the threshold and wording)
- **PR:** #264 (issue #193). Amends D-222.

**Problem.** D-222 grades ACS estimates by coefficient of variation (CV = (MOE / 1.645) / value),
which can't grade a zero. Tiny counties showed 0% ±57.7 points (Loving County, TX: bike, transit,
work from home) with no caution, as solid-looking as any value. Places with no value showed a bare
"No data".

**Decided (Robbie).** A zero with a large margin gets the same treatment as other unreliable
estimates. Where a place has no value, say why where the visitor looks.

**Defaults taken.**

1. **Rule:** an estimate of exactly 0 whose margin of error is **more than 5** (percentage points
   for percentages) is graded **unreliable**: the "Unreliable estimate" note, and hatched at tract
   and block-group level when hatching is on (counties and states still aren't hatched, D-222). A zero
   with a margin of 5 or less stays ungraded, as before. One constant: `RELIABILITY.zeroMoe` in
   `packages/design/src/reliability.ts`.
   - Why points rather than a share of the national spread: grading stays a pure function of value and
     margin, so the details panel, place page, compare page and hatching share it without loading
     national files. Nearly every ACS zero is a percentage (no county has a zero for any dollar, minutes,
     years or ratio dataset).
   - Why 5: at 5 points the plausible range covers most of the national spread for the low-share
     datasets where zeros happen (county bike commuting: 95% of counties are under 1.1%). County level,
     margins > 5 on zeros: bike 10, transit 9, limited English 23, overcrowding 18 counties (all small).
     Tract level, four sampled counties (Hennepin, Loving, Cook, Gallatin MT), 8,722 zero percentages:
     margin > 1: 2,792; > 2: 1,289; > 3: 703; **> 5: 389**; > 10: 172. This is conservative next to the
     CV rule (47% of the non-zero tract percentages there grade unreliable); lowering the constant
     flags more.
2. **Note text for a zero:** "The margin of error is large for an estimate of zero, so the true value
   could be well above zero." (title "Unreliable estimate", as D-222). The hatch legend line adds
   "(or are zero with a wide margin)".
3. **Place page, the drawer's full list and the compare page's values** now show the grade's title
   under a value ("Use with caution" / "Unreliable estimate") for every graded ACS estimate, not just
   zeros; before, only the details panel and the compare page's head counts did.
   A zero **head count** on the compare page isn't graded: the 5-point rule is for percentages, and every
   published zero count has a margin of 10 or more (all 1,202 counties with no bike commuters), so it
   would flag solid zeros too. The rate under it carries the grade.
4. **No-value reasons** (`noDataReason`, `apps/web/src/lib/reliability.ts`), first match wins:
   - Puerto Rico place, and the dataset's `coverageNote` mentions Puerto Rico: "This source has no data
     for Puerto Rico." (the coverage note is the registry's record that the source leaves PR out; e.g.
     bridges cover PR, so a PR municipio with no bridge value doesn't get this line).
   - Connecticut planning region (county geoid 091xx) on a non-Census source: "This source still uses
     Connecticut's old counties (before 2022)."
   - Census source (ACS, 2020 Census): "The Census Bureau doesn't publish this figure for this area."
   - Anything else: "The source has no value for this area."
   Shown under "No data" in the details panel and under the row on the place page and drawer list.
