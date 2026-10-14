# D-332 · Change maps: no span heading over From/To; hover leads with the change

- **Date:** 2026-10-14
- **Status:** DEFAULTED (worker; Robbie's video feedback 2026-10-13, issue #200)
- **PR:** #232 (issue #200)

Amends D-267's change-mode layout.

**Map options › Time › Change.** The large "A → B" heading is gone: it wrapped onto two lines and
repeated the years the From and To buttons already show. From and To are now two labeled rows
(label left, buttons right, like a small table; slider pickers keep their label and large year).
The plain line "The map shows how each area changed from A to B." moves under the two rows.

**Hover card on a change map.** The change ("−1.3 pts", "+12%", "No clear change", "No data…") is
the largest line (1.5rem), with the dataset name small above it; the place name and the
"County · change, A → B" line stay on top, and both values ("12.1% → 10.8%") sit just under the
change. Added as an optional `lead` on the shared `Popup` (`packages/design`), so other popups
are unchanged.
