# D-267 · Year slider scrubs; change maps pick both ends

- **Date:** 2026-10-12
- **Status:** DEFAULTED (worker; Robbie asked for "as obvious as possible", issue #168)
- **PR:** #167 (issues #165, #168)

**Year slider (#165).** The year reads in large type and follows the thumb while dragging; the map
loads after a 150 ms pause or on release, not for every year passed. Keys, taps and the step
buttons apply at once. Idea from Watermelon UI's scrub-slider (MIT), rebuilt with our tokens.

**Change maps pick From and To (#168).** This amends D-252, where change always ran to the latest
period.
- Change mode shows both ends: "2010–2014 → 2015–2019" in large type, "The map shows how each area
  changed from A to B.", then a **From** picker and a **To** picker (buttons or slider, like the
  year picker).
- Turning Change on keeps the year picked in Values as **To** when an earlier period exists, and
  starts **From** at the oldest period. Otherwise To is the latest period. Back to Values shows To.
- A new To keeps From when it's still earlier, else From goes back to the oldest period.
- URL: `since=<From>&t=<To>`; `t` omitted = the latest period, so old `since=` links open as before.
  A `since` that isn't before `t` falls back to the latest period as To.
- **Margins of error:** still tested only when To is the default period (D-252's limit). On other
  To periods the middle class reads "No change", as it already did for untested levels.
- The hover card, the details card ("change, A → B"), the legend caption and the line under the
  dataset name name both periods.
