# D-135 · Map menus respond to screen size and to what the visitor is doing

- **Date:** 2026-10-02
- **Status:** PROPOSED (prototype for Robbie's review; not merged until he approves the mockups)
- **PR:** #35 (issue #34)
- **Changes:** D-25 (chrome), D-28 (docked filters), D-35 (heading menus), D-36 (year control placement)

**Robbie (2026-10-02):** "Preferably, id like to see these menus be much more responsive to screen
size and scrolling. Once someone begins scrolling, panning, clicking, or zooming, the experience with
the menus should change in a way that makes it easier to navigate the site and view the content."

## Decided by Robbie

1. **Menus step aside while the map moves, on smaller screens only:** narrower than 1440 px or
   shorter than 900 px (phones, tablets, laptops). A pan, pinch or scroll closes open menus and sets
   the filters sidebar aside; they return about half a second after the map settles. Larger monitors
   keep the sidebar and legend in place; an open dataset list closes on pan everywhere (the lead's
   suggestion, open to argument).
2. **Phones open the category and dataset lists as a bottom sheet:** categories as a swipeable chip
   row, datasets below. It's the same sheet component as the details; opening one closes the other.
3. **No frosted glass.** The zoom pill, back button, menu button, legend strip and filter button are
   flat, solid panels (panel color, 1 px border, faint shadow), like the dataset card.
4. **"Inside" links:** the details show the places a selection sits inside ("Minnesota › Hennepin
   County"); tapping one selects and frames it. The phone wordmark hides when immersed.
5. **Filters (replaces the docked filters of D-28):** a small filter button sits under the dataset
   name, at rest and immersed, with a count when something is set. Phones: the panel grows from the
   button to full screen; changes are staged, and Apply shrinks it back into the button. Desktop: a
   sidebar over the left of the map (not a fixed column) between the title and the legend strip.
   The panel holds the year control, geography level and facet filters.

## Defaulted (worker; listed for Robbie's review)

- Desktop sidebar applies changes live (standard for map sidebars); phones use Apply.
- The count includes each hidden value, a pinned level and a non-default year.
- Beside the button: the level shown ("Census tracts · block groups closer in" near a band edge) or,
  for feature layers, what's filtered ("2 road types hidden").
- The year control moved out of the legend into the filters panel; the legend strip still names a
  non-default year.
- The sidebar uses the solid panel style. Robbie allowed frosted glass for this sidebar only; adding it
  was blocked in this session, so it's left for the lead to decide.
- Phones: the at-rest card's actions are links on its meta line; the title's caret opens the dataset
  list. Desktop: the heading's drop-down lists categories beside that category's datasets.
- Phones: the details sheet carries a small legend key with the place's class outlined; the desktop
  legend marks the selected place's class.

## Code

`components/map-page/useMapMotion.ts` (moving state), `FiltersPanel.tsx` (button, sheet, sidebar),
`DatasetMenus.tsx` (`DatasetSheet`), `DetailPanel.tsx` (inside links), `globals.css` (`.wg-panel`
replaces `.wg-glass`), `useIsCompact` in `BottomSheet.tsx`.
