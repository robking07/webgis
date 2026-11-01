# D-562 · A state click frames the state; the back button says where it goes

- **Date:** 2026-10-31
- **Status:** DECIDED (Robbie asked, lead shaped the wording), worker defaults noted below
- **PR:** #462 (issue #437)

Robbie (2026-10-31): clicking a state from the national view should zoom to the state, centered on
every screen, and the return arrow should say where it goes. This reverses D-418 for states only:
one click on a state fits it whole (clear of the details panel, phone sheet and heading, the same
`clearArea(true)` padding as before). Counties and finer keep D-418 (click centers, double click fits).

Back button words (lead: sentence case), from where Back goes, one step up the drill-down:

- out of a focused place to the whole map: "Back to national view";
- to a state: "Back to Minnesota view"; to a county: "Back to Hennepin County";
- to a tract, block group or block: "Back to tract", "Back to block group", "Back to block".

Worker defaults (the lead may change them):

- **Where it sits.** The worded button sits under the focused place's name, at the left, not in the
  right-hand column: there a wide button ran under the desktop details panel and into the phone
  heading. The right column keeps its icon-only back button for a click that moved the map without
  focusing a place ("Back to the previous view"), which the issue didn't cover.
- **A drill click waits two frames before it frames the place**, so the padding measures the
  full-screen layout that focusing opens (the same wait `goToPlace` uses); measured at once, the
  at-rest dataset card pushed the state low on laptops.
- A click that only selects inside a focused place (the map's finest level) adds no back step, as
  before, so the button still names the step above the focused place.
