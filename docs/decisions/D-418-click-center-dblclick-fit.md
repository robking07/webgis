# D-418 · Map click centers, double click fits

- **Date:** 2026-10-20
- **Status:** DECIDED (Robbie asked for the behavior; lead calls below), defaults by the worker noted
- **PR:** #318 (issues #317, #180)

Robbie (2026-10-20): one click on a feature selects it and only centers it, at the same zoom; hover
popups stay as they are; a double click does what one click used to do, framing the whole feature,
centered. "Centered" is the middle of the map you can see, clear of the details panel, phone drawer
and header: both moves use `useFraming`'s `clearArea(true)` padding, the same as before.

Lead calls:

- A double click on empty map (no feature) keeps MapLibre's normal zoom-in by one step. A double
  click on a feature does not also zoom in a step.
- One click acts at once, with no wait to see if a second click comes. Centering, then fitting,
  reads as one smooth move.
- Phones mirror the mouse: tap selects and centers, double tap fits.
- Compare mode, change maps and Specials keep what they did. Compare maps ignore clicks; Specials'
  inline maps and the insight map have no click-to-zoom, so a double click there still zooms in a step.

How: `MapView` treats a second click within 500 ms and 24 px of a click that picked something as a
double click, and repeats the first click's pick with `fit` (after a drill-down the place under the
pointer is one of its parts). It cancels MapLibre's double-click zoom on the `dblclick` event and its
double-tap zoom at the second `touchstart`.

Worker defaults (the lead may change them):

- A single click outside a focused place adds a Back step, as the old click-to-zoom did; Back undoes
  the move and closes the details. The double click adds no second step.
- Inside a focused place, a click on one of its parts now also centers it (before, it didn't move),
  and a double click frames it.
- #180: `setCamera` passes explicit zero padding, so after Back the view is centered again.
