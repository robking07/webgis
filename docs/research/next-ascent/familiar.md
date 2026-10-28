# Making the map feel familiar (research R2)

Status: sections 1–2 done (catalog, Mapwich today).
Next: section 3, adopt / skip / beat.

Robbie's note: "Research and review of Google Maps functionality by Claude to use established best
practices and cement familiarity with the users that 'they know how this works'."

**How this was done.** Public help pages and design write-ups (Google Maps help, Felt help, Apple's
HIG, Redfin/Zillow posts, Windy community; list at the end), plus what's widely known about these
apps. No browser, so nothing here was clicked through live. Mapwich was walked in code
(`apps/web/src/components/`, `Viewer.tsx`, `MapView.tsx`, `lib/search.ts`, `lib/url-state.ts`) at
`origin/main` 5bd1f06. The live site's map page renders in the browser, so its raw HTML only shows
the header; the code is the better witness.

## 1. Patterns people already know

The point of each row: what a visitor's thumb or mouse does without thinking, because Google or
Apple taught it.

### Search

| Pattern | What people expect | Who does it |
|---|---|---|
| One box, top left (desktop) or top (phone) | Always visible, not behind an icon. Typing anywhere starts it on desktop (`/` in many web apps). | Google, Apple, Zillow, Redfin, Felt |
| Autocomplete as you type | Suggestions after 1–2 letters; ranked by importance and nearness to the current view; bold match. | All |
| Any kind of place | Address, ZIP, city, county, landmark, lat/long pasted in, even "near me". | Google, Apple, Zillow (address/ZIP/neighborhood) |
| Recent searches | Focusing the empty box shows the last 5–10 searches and places. | Google, Apple, Zillow, Redfin |
| Category chips under the box | "Restaurants · Gas · Hotels": one tap filters the map. | Google, Apple |
| "Search this area" | After panning, results don't jump; a button offers to refresh for the new view (Zillow/Redfin refresh automatically). | Google, Airbnb, Zillow, Redfin |
| Draw a boundary | Trace a shape on the map to limit results. | Zillow, Redfin |

### Place cards and sheets

| Pattern | What people expect | Who does it |
|---|---|---|
| Place card | Click a place → a card with name, type, key facts, a row of action buttons (Directions, Save, Share, Nearby), then details below. | Google, Apple |
| Desktop left panel | The card is a fixed left column; the map stays to the right. | Google, Apple (web), Felt |
| Phone bottom sheet, three stops | **Peek** (name + one line), **half** (key facts + actions, map still visible above), **full** (scroll everything). Drag the handle; the map behind stays live. | Google, Apple, Strava, Zillow |
| Breadcrumb / "part of" | "Part of Hennepin County" links upward. | Apple ("in"), Google (address lines) |
| Photos and street view on the card | A thumbnail of the street; tap to look around. | Google (Street View), Apple (Look Around) |
| Back closes the card | Phone Back and browser Back close the card before leaving the page. | All |

### Pointing at the map

| Pattern | What people expect | Who does it |
|---|---|---|
| Right-click (desktop) / long-press (phone) "What's here?" | Drops a pin; shows coordinates (click to copy), the address, and a menu: Directions from/to here, Measure distance, What's nearby. | Google, Apple |
| Hover tooltips | Desktop only; a small label, never on phones. | Felt, Windy, Zillow (price pins) |
| Click anywhere for a reading | Click any point → that point's numbers over time. | Windy ("picker"), weather apps |
| Measure distance | Right-click → Measure; click to add points, drag to move, total in mi and km at the bottom; area for closed shapes. | Google, Felt (ruler) |
| From here to there | Directions from/to any pin. | Google, Apple |

### Map controls

| Pattern | What people expect | Who does it |
|---|---|---|
| Zoom + / − | Bottom right (Google) or top right; phones pinch and have none. | All |
| My location | A crosshair button; permission asked only on tap; blue dot. | Google, Apple, Strava, Zillow |
| Compass | Appears only when the map is rotated; tap to point north. | Google, Apple |
| Layers button | One square button (stacked-sheets icon) opens a small panel of map types (Default/Satellite/Terrain) and overlays (Traffic/Transit/Biking). | Google, Apple, Windy, Strava |
| Scale bar | Small, bottom; follows the user's units. | Google, Apple |
| Time slider | A bottom bar with play/scrub through time. | Windy, weather apps |
| 3D / tilt | Two-finger tilt; a 3D button. | Google, Apple |

### Memory and sharing

| Pattern | What people expect | Who does it |
|---|---|---|
| Share | A Share button on every card; the link opens the same place and view; phones use the system share sheet. | All |
| Saved places and lists | A Save button; lists ("Want to go"), shareable; a heart on Zillow/Redfin. Needs an account. | Google, Apple, Zillow, Redfin, Strava |
| Home / Work | Two pinned places for quick jumps. | Google, Apple |
| Timeline | Where you've been (account, opt-in). | Google |
| Alerts on saved things | "New listing in your saved search". | Zillow, Redfin |

### Other

| Pattern | What people expect | Who does it |
|---|---|---|
| Keyboard | Arrows pan, + / − zoom, a shortcut list (Google: Ctrl + /; Felt: 0 resets the view, F fits the selection, copy-link chord). | Google, Felt |
| Accessibility | Every control labeled; actions possible without precise gestures; 44 pt targets; color never alone. | Apple HIG, WCAG |
| Offline | Download an area (Google, Apple, Strava paid). | Google, Apple |
| Embed / print / image | Export the view as an image or print layout. | Felt, Google My Maps |
| Theme | Dark mode follows the device. | All |

## 2. Mapwich today: matches / differs / missing

Legend: **Match** = works the way people expect · **Differs** = exists but behaves unlike the apps ·
**Missing** = not there.

| Pattern | Mapwich today (code) | Verdict |
|---|---|---|
| Search box placement | An icon at the right of the header, plus `/` (D-35, `SearchOverlay.tsx`). Opens a dimmed full overlay, not a box over the map. On phones it is full screen, field mid-screen until typing. | **Differs.** Familiar shortcut, unfamiliar spot. People look top left for a box. When immersed, search is behind the menu button. |
| Autocomplete | Results from 2 letters; places and datasets in two labeled groups; arrows, Enter, Esc; proper combobox roles. | **Match** (better than most for datasets). |
| What you can search | States, counties, 32k Gazetteer cities/towns/CDPs, MPOs, aliases; a 5-digit ZIP goes to the county holding most of it (`lib/search.ts`). | **Differs.** No street address, no lat/long paste, no tract/neighborhood, ZIP lands on a county (a known shortcut). For a planner, "what tract is 390 Robert St in?" is a daily question. |
| Ranking by view | Fixed rank: state > county > city > MPO, then population. | **Differs.** Google ranks by nearness to the view; typing "Washington" in Minnesota should offer Washington County, MN first. |
| Recent searches | None. Theme and units are the only things remembered (`localStorage`). | **Missing.** |
| Category chips | The dataset menu's categories (desktop drop-down, phone chip row in the sheet, D-326). | **Match** in spirit; they pick a map, not filter places. |
| Search this area / draw | Not applicable today; no point results to refresh. Focused place (`in=`) is the closest. | Skip (see §3) except as a dream. |
| Place card | Click → details panel (desktop right side) / bottom sheet (phone): value, period, rank, margin note, inside links ("Minnesota › Hennepin County"), Compare with…, Learn more, full data list (`DetailPanel.tsx`, `PlaceDataList.tsx`). Place pages at `/place/<geoid>`. | **Match**, with richer content than any consumer app. **Differs:** desktop panel on the right while Google/Apple use the left; no action-button row (Share, Compare, Profile are scattered). |
| Bottom sheet stops | Two stops: peek and full (90%) (`BottomSheet.tsx`). Swipe down from peek closes. | **Differs.** No half stop: from peek, one swipe goes nearly full screen and hides the map, the very thing the visitor is looking at. |
| Back closes the card | Back steps out of drill-downs (one history step each, D-329) and an on-map Back button undoes the last click move. The details sheet isn't a history step. | **Differs** a little: phone Back after opening details can leave the map state instead of closing the sheet. Worth a check by the tester. |
| Right-click / long-press "what's here" | None. Click selects the polygon at the current level only. | **Missing.** Biggest gap for a data map: one point lives in a state, county, tract, block group, MPO and city at once. |
| Hover | Desktop hover popups with one clear hierarchy (D-359). Phones tap. | **Match.** |
| Measure | None. | **Missing.** Planners measure constantly. |
| From here to there | None (drive times #205 parked). | **Missing**, and mostly out of scope. |
| Zoom buttons | Desktop pill top right; phones pinch only (D-25). | **Match.** |
| My location | None. | **Missing.** The commonest button on any phone map. |
| Compass / rotation | Rotation and tilt are off (`dragRotate: false`, `disableRotation`). | **Match** by design: north stays up, so no compass is needed. |
| Layers button | The dataset title's drop-down is the "what's on the map" control; display options sit in the filters panel. No basemap switch (no satellite). A "Go to" map button lists regions and states. | **Differs.** People hunt for the stacked-squares button. The "Go to" button uses a map icon that reads as "layers" to Google users. |
| Scale bar | MapLibre scale bar, units setting (miles/km), hidden at national zoom. | **Match.** |
| Time slider | Year control lives in the filters panel (D-135), not a bottom scrubber. | **Differs**; fine for 3 ACS periods, less so for 35 climate years. |
| Share | Share button: phone share sheet, laptop copies the link; URL holds dataset, view, year, focus. | **Match.** |
| Saved places / lists | None. No accounts (by design). | **Missing.** |
| Keyboard | `/` search, Esc steps back; MapLibre's built-in arrows and + / − on the focused map. No shortcut list. | **Partly.** Missing `?` help, fit-selection, reset view. |
| Street-level imagery | Only for road segments (AADT "Learn more" opens Google Street View). | **Partly.** |
| Offline | None. | Missing; skip (see §3). |
| Accessibility | Labeled controls, combobox roles, sheet handle is a button, reduced-motion respected, design check enforces contrast. | **Match** on basics. Not checked: screen-reader path to the map's values without the mouse (the table does this). |
| Theme | System / light / dark, remembered. | **Match.** |
