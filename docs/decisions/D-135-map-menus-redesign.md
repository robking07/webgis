# D-135 · Map menus respond to screen size and to what the visitor is doing

- **Date:** 2026-10-02
- **Status:** ACCEPTED (Robbie approved the redesign on 2026-10-03, with the three review changes below)
- **PR:** #35 (issue #34)
- **Changes:** D-25 (chrome), D-28 (docked filters), D-35 (heading menus; item 8, Learn more links), D-36 (year control placement)

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
3. **Flat chrome, a glass sidebar.** The zoom pill, back button, menu button, legend strip and filter
   button are flat, solid panels (panel color, 1 px border, faint shadow), like the dataset card. The
   desktop filters sidebar is frosted glass (see the amendment below).
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
- Phones: the at-rest card's actions are links on its meta line; the title's caret opens the dataset
  list. Desktop: the heading's drop-down lists categories beside that category's datasets.
- Phones: the details sheet carries a small legend key with the place's class outlined; the desktop
  legend marks the selected place's class.

## Code

`components/map-page/useMapMotion.ts` (moving state), `FiltersPanel.tsx` (button, sheet, sidebar),
`DatasetMenus.tsx` (`DatasetSheet`), `DetailPanel.tsx` (inside links), `globals.css` (`.wg-panel`
for the flat chrome), `packages/design/src/components/design.css` (`.wg-glass`, the sidebar),
`useIsCompact` in `BottomSheet.tsx`.

## Amendment (2026-10-02, Robbie): frosted glass for the desktop filters sidebar

Robbie: "Rule change: frosted glass is no longer blacklisted. We can proceed with menu redesign using
frosted glass", and for this sidebar, "Yes, frosted glass sidebar".

- The desktop filters sidebar (`FiltersSidebar`) uses `.wg-glass`: the panel color (`--ui-surface`) at
  84% opacity in light and 80% in dark, a 16 px backdrop blur, the 1 px border token (`--ui-border`)
  and a faint shadow. The opacity is high on purpose so text and checkboxes stay legible over busy
  maps; browsers without backdrop-filter get the solid panel color.
- Everything else over the map stays flat and solid (zoom pill, Back, menu button, legend strip,
  filter button). Robbie can ask for glass on those too; it's a class swap.
- The phone filters panel is full screen and covers the map, so it stays solid.

## Amendment (2026-10-03, Robbie's review): three changes, then approved

Robbie: "Okay good to go, read comments, and make sure your agents are testing these changes after
implementation".

1. **Phone card wrapping** ("Text wrapping here is a bad look"). The phone card's meta and its
   actions each get one line that never wraps: "State · 2020–2024 · Census Bureau ⓘ", then
   "Compare · Table · About" on its own line. The meta uses a new optional registry field,
   `source.shortName` (at most 24 characters, set for all 60 entries: Census Bureau, CDC PLACES,
   NOAA, FHWA, NHTSA, CEJST, Deportation Data Project); without it the name is cut at its first
   comma or parenthesis as before. Desktop keeps the full name. Last resort: the source, which is
   last on the line, ends in an ellipsis. That happens once today, on a 360 px phone:
   "State · Active as of Oct. 2026 · Deportation Data Pro…". Long titles wrap onto two balanced lines.
2. **Contrast on phones** ("The contrast here is still really terrible, I think we need to get
   serious about making this easier to see on mobile"). Every control and label over the map now
   sits on a solid panel with full-contrast text: the dataset heading (category and title), the
   level or filter note ("Census tracts · block groups closer in", "2 road types hidden"), the
   Filters button, the legend strip, the menu button, Back, and the credits line. On phones the
   panels and the at-rest card take a strong edge, a new `controlEdge` token (light #858179, dark
   #767a83), at 3:1 or more against the panel and against U.S. land. The halo-only text style
   (`.wg-on-map`) is gone. The design gate checks the pairs: on-map text and secondary text on the
   panel (4.5:1), icons (3:1), the count badge (4.5:1), the edge against the panel and the land
   (3:1), and, new, the frosted-glass sidebar's text over the darkest and lightest map colors
   (4.5:1). That glass check failed in dark mode (muted text over pale classes, 3.6:1), so the dark
   glass went from 80% to 88% opacity (`GLASS_ALPHA` in `themes.ts` must match `design.css`).
   **Laptops and monitors:** the halo text there read just as badly over dark classes, so the
   heading, the note and the credits got the same solid backings at every size. Their panel edges
   keep the quiet border (1.45:1); the strong edge is phones only.
3. **No Census Reporter link** ("I think we need to remove the link to census reporter, it's out
   of place"). The Census Reporter `learnMore` entry is removed from all 42 registry entries that
   had it. **This changes D-35 item 8:** Learn more now holds only Google Street View for roads and
   the PEDP CEJST tool for CEJST tracts and counties; datasets with no links show no Learn more
   heading.

Also fixed while testing: the filters sidebar steps aside while the dataset drop-down is open (they
overlapped on monitors); the 2020 Census datasets no longer request a block values file that
doesn't exist (blocks carry their values in the tiles); and a state's phone details no longer
request rank files for county-only datasets. Both requests were console 404s.

**Tests:** `apps/web/e2e/menus.spec.mjs` (`npm run test:e2e -w web`; see `apps/web/e2e/README.md`)
checks all of this at 390 × 844, 1366 × 768 and 1920 × 1080, including the measured contrast of
each on-map element against its own backing, in light and dark.
