# D-326 · One dataset menu: the title's drop-down

- **Date:** 2026-10-14
- **Status:** DECIDED (Robbie) with worker defaults (marked)
- **PR:** #226 (issue #225)
- **Changes:** D-311 (the Change dataset button and its amendment), D-323 (where compare mode's picker lives), D-35 / D-135 (the heading drop-down)

**Robbie (2026-10-14):** "the change dataset button here is duplicative of the carrot drop down
ability to change the dataset. Also, this showed me that we have two different dataset menus ... I
prefer number two way more, however, I want it to have more the height that number 1 has.
Additionally, I want a button/link in the button left of 2 that brings a user to the 'full dataset
library' like in 1".

## Decided by Robbie

- The title drop-down (categories on the left, that category's datasets under subcategory headings
  on the right) is the only dataset menu on laptops and larger screens. It is taller, has a search
  box at the top, and "Browse the full data library →" (to `/data`) at the bottom left.
- The side panel ("Datasets" with search, chips and a list) is gone. Compare mode's picking states
  move into the drop-down: "Choose a second map", "Replace which map?", "Replace <map>", and
  greyed-out maps with the reason (`pairReason`, D-323). "Compare datasets" opens it to choose a
  second map; while comparing, the title asks which map to replace first.
- The "Change dataset" button is removed everywhere (the card, the full-screen heading, phones). The
  title with its caret is the way to change maps, on the card and in the full-screen heading.
- Phones keep the dataset sheet (categories as chips).

## Worker defaults (open to Robbie)

- **Height:** from under the title down to 84 px above the screen's bottom, the same line the filters
  sidebar stops at, so the legend strip stays visible. While the menu is open the full legend card
  shrinks to its strip, as it does for the filters sidebar (D-135). The asking state ("Replace which
  map?") is only as tall as its two buttons.
- **The card's title** (at rest, laptops) is now a button with a caret, like the full-screen heading.
- **Search** spans every category. While a search is typed, no category is selected and the results
  show each category's name above its subcategories; clicking a category clears the search. No
  matches: "No datasets match “…”".
- **Keyboard:** opening the menu puts focus in the search box (on the first button when asking which
  map to replace); Tab moves through the categories and maps; Esc closes the menu only (not the
  full-screen view) and returns focus to the title. A pan or zoom on the map closes it (D-135).
- **Phones:** the sheet gains the same search box above the chips, the compare states and the
  greyed-out maps (it was already the phone menu, and the side panel it replaced for comparing is
  gone), and the data library link at the end of the list.

## Code

`apps/web/src/components/DatasetMenus.tsx` (`DatasetMenu` drop-down, `DatasetSheet`, `DatasetHeading`,
shared `usePicker`), `map-page/DatasetCard.tsx`, `map-page/ImmersedHeading.tsx`, `Viewer.tsx` (one
`browse` state opens either). Deleted: `DatasetBrowser.tsx` and the `DatasetsPanel` side panel
(`LeaveComparePrompt` stays, in its own file). `DatasetFilter.tsx` exports the search box alone
(`DatasetSearch`). Tests: `apps/web/e2e/menus.spec.mjs` ("laptop dataset menu …", "laptop hidden
card …") and `compare-mode.tests.mjs`.
