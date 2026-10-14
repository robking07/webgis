# D-323 · Compare two maps is a mode you enter and leave

- **Date:** 2026-10-14
- **Status:** DECIDED (Robbie) with worker defaults (marked)
- **PR:** #223 (issue #198)

The two-variable map (`?d=<a>&b=<b>`) now reads as a mode.

**Robbie's choices (2026-10-14):**
- While comparing, the dataset card gets a tinted strip across its top with **Swap** (switch which
  map is first) and **Exit** (back to the first map alone). Full screen (card hidden, D-25) folds it
  into the existing heading as an Exit button. No new floating panel.
- "Change dataset" while comparing first asks which map to replace, then opens the picker for it.
- Maps that can't pair show greyed out with a short reason while picking, not hidden.
- Entering, swapping and leaving compare are each a Back step (PR #220's history pushes on `b`).

**Worker defaults (open to Robbie):**
- Strip text "Comparing two maps" (the names are already in the title right under it; the card is
  too narrow for both names plus two buttons on one line). Full-screen button: "Exit comparing"
  (laptops), "Exit" (phones).
- Picker headings: "Choose a second map" (entering), "Replace which map?" (asking), "Replace
  <map>" (after the choice), with the line "Shown on one map with <map>. Greyed-out maps can't be
  paired with it." The per-row "Compare with map (bivariate)" / "Stop comparing" links are gone;
  "Compare datasets" on the card is the way in, and it hides while comparing.
- Reasons: "Already on the map", "Roads and sites can't be compared", "Not mapped for the
  same kinds of area" (no geography level in common; blocks don't count).
- Phones: the strip takes the category row's place and Share moves to the actions line, so the
  card grows only by the strip's padding (D-135).
- Opening a map that can't pair from outside the picker ("Map it", search): see the amendment.
- Colour: a new design token `ui.compareTint` (pale accent wash), contrast-checked for text (7:1)
  and accent text (4.5:1) in both themes.

One rule, `pairReason` in `apps/web/src/lib/layers.ts`, decides pairing for both the picker and the
map, so the picker never offers a pair the map won't draw.

## Amendments

- 2026-10-14 (Robbie): the strip stays "Comparing two maps · Swap · Exit", with the names in the
  title under it; the generic "Not mapped for the same kinds of area" reason stays.
- 2026-10-14 (Robbie): ask first. While comparing, opening a map that can't pair with the second
  one from anywhere outside the picker ("Map it", search) shows "<map> can't be compared with
  <second map>. Open it on its own?" with **Open on its own** / **Cancel** (a sheet on phones, a
  small panel on laptops). Cancel keeps the comparison as it was. Opening the second map itself
  still shows it alone, without asking.
