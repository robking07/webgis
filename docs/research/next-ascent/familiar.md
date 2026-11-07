# Making the map feel familiar (research R2)

Status: complete (sections 1–5). Not verified: live clicks on the site; USGS imagery terms read only from memory.
Next: nothing; the lead harvests.

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

## 3. Adopt, skip, beat

Sizes: S ≈ 100k tokens, M ≈ 275k, L ≈ 500k, XL = several L. Running cost is $0 unless stated.
Every idea below keeps D-25's rule: the map wins, chrome falls away once the visitor moves the map.

### Adopt (familiar, cheap, serves Robbie's weekly use)

**A1. Search where people look, with recents.**
- *Visitor:* on desktop a real search box sits at the left of the header ("Search a place, address
  or dataset"), not just a magnifier icon. Clicking into it, before typing, lists the last 8 places
  and maps they opened. `/` still works. Phones keep the icon (the dataset card owns the top).
- *Robbie's weekly use:* he goes back to the same dozen places (Twin Cities counties, Met Council
  MPO, Holmes County). Recents make that one tap.
- *Size:* S (~80k). Recents live in the browser only (`localStorage`, wrapped in try/catch like
  theme and units). *Cost:* $0. *Fork:* no. *Builds on:* `SearchOverlay.tsx`, the `lib/theme.ts` pattern.
- *Map-first check:* the box shows only at rest; immersed, the menu button brings it back, as now.

**A2. Rank places by where the map is.**
- *Visitor:* typing "Washington" while looking at Minnesota offers Washington County, MN first.
- *Weekly use:* fewer wrong jumps for a Minnesota-based user. *Size:* S (~40k, a distance term in
  `searchPlaces`; check the index holds a point or bbox per place). *Cost:* $0. *Builds on:* `lib/search.ts`.

**A3. Street addresses and pasted coordinates.**
- *Visitor:* types "390 Robert St N, St Paul" or pastes "44.948, -93.091". The map drops a pin,
  frames the tract, and the card says "Census tract 342, block group 1, Ramsey County, MN".
- *Weekly use:* the planner's most common lookup: "what tract/block group is this site in?"
- *How:* the U.S. Census Geocoder (free, public domain, no key) returns the coordinates *and* the
  state, county, tract and block group GEOIDs in one call (checked 2026-10-27: 390 Robert St N →
  block group 271230342011). It sends no CORS header, so the browser can't call it directly: a
  tiny Vercel function passes the request through (the repo already has `app/api/`). Pasted
  coordinates need no lookup at all.
- *Size:* S–M (~150k incl. the pin, the proxy, error states). *Cost:* $0 (Hobby function calls;
  cache answers). *Fork:* no. *Privacy:* addresses go to the Census Bureau; say so in one line under
  the box; don't log them.

**A4. A half stop on the phone sheet, and one action row on every card.**
- *Visitor:* the details sheet opens at peek, swipes to half (value, rank, actions, map still
  visible above), then full. Under the place name, one row of round buttons, Google style:
  **Compare · Profile · Share · Save** (Save once A8 exists).
- *Weekly use:* Robbie checks a number on his phone without losing the map; Share is one tap.
- *Size:* S (~90k). *Builds on:* `BottomSheet.tsx` (a third snap), `DetailPanel.tsx`,
  `ShareButton.tsx`, `CompareWith.tsx`.

**A5. "What's here?" on right-click and long-press.** The star of this report; §4 D1 has the full
version. Small version: right-click / long-press drops a pin and opens a card listing every place
the point sits in (state › county › city › tract › block group, plus MPO), each with the current
map's value, and the coordinates (tap to copy). Menu: Measure from here, Compare this place with…,
Street View here (a plain Google Maps link, as AADT's Learn more already does), Copy link.
- *Size:* M (~250k). *Cost:* $0 if the lookup reads Mapwich's own boundary tiles (see D1).
- *Weekly use:* very high; this is how a GIS person interrogates a map.

**A6. My location.**
- *Visitor:* a crosshair button under the zoom pill (phones: in the right-hand column). Tap → the
  browser asks permission → blue dot → the map frames the visitor's tract and opens its card.
- *Weekly use:* low for Robbie at his desk, high for the public on phones ("what's my neighborhood
  like?") and for him in the field.
- *Size:* S (~60k; MapLibre's `GeolocateControl` restyled from tokens, or a few lines of
  `navigator.geolocation`). *Cost:* $0. *Wording:* "Your location stays on this device" (true: no
  server needed). **Flag:** wording about people/privacy, for Robbie.

**A7. Measure distance and area.**
- *Visitor:* right-click → Measure (or the ruler in the "what's here" card, or `M`). Click points;
  the total shows at the bottom in the visitor's units; close the loop for area. Esc ends it.
- *Weekly use:* planners measure corridor lengths and buffers. Today he leaves for Google.
- *Size:* S–M (~120k; great-circle math is a few lines, no new library; line and dot styles from
  `packages/design` tokens per the hard rule). *Cost:* $0. *Builds on:* the units setting.

**A8. Saved places, no account.** A Save star on the card and a "Saved" group at the top of the
empty search box. Stored in the browser. S (~70k) on top of A1. Lists and sharing: §4 D2.

**A9. Keyboard shortcuts and a `?` sheet.**
- *Visitor:* `?` opens a short list. Add what Google and Felt users reach for: `0` whole-country
  view, `F` fit the selected place, `B` back, `[` / `]` previous/next year, `C` compare, `S` copy
  share link, `M` measure, `L` my location.
- *Weekly use:* Robbie is a desktop power user. *Size:* S (~50k). *Cost:* $0. Skip when focus is in
  a text field, as `/` already does.

**A10. Fix the "Go to" icon.** It uses a folded-map icon that Google users read as "layers". A
globe or compass icon with the tooltip "Go to" is clearer. XS (~10k); fold into any task above.

### Adopt with care

**A11. An imagery base map.** Google/Apple users expect one square button that switches the base
map. Mapwich's "what's on the map" control is the dataset title (D-326) and should stay. But aerial
imagery helps a planner see what a tract *is* (a rail yard, a lake). **USGS National Map imagery**
(`USGSImageryOnly`) is public domain and U.S.-only, so it fits "US only, go deeper" and costs $0.
Choropleths need lower opacity over imagery and labels need halos: design-token work
(`maplibre-cartography` skill). *Size:* M (~200k, mostly the contrast checks). Put the switch in
Settings or Map options, not as new permanent chrome.

**A12. A bottom time scrubber for long timelines.** For 35 climate years and 10 FARS years, a
Windy-style strip with play/pause beats a control inside a panel. Keep the panel control for the
three ACS periods. *Size:* S–M (~120k). Respect reduced motion (no autoplay).

### Deliberately skip

| Pattern | Why skip |
|---|---|
| Directions / routing | Not a data question; needs a routing service. Drive times stay parked (#205). |
| Offline downloads | Tiles on R2 cache well; offline packs are big work for a desk tool. |
| Compass, rotation, 3D tilt | North-up is right for thematic maps; rotation is off on purpose. |
| Photos, reviews, businesses, POI chips | Not data; license trouble; would make Mapwich a worse Google. |
| Accounts and sign-in | Cost, privacy duty, and Robbie's time. Browser storage + share links cover it (D2). |
| Embedded Street View / Look Around | Google's embed API bills per load; a plain link out is free and familiar. Mapillary (open imagery) is a possible later swap. |
| "Search this area" / live result lists | Nothing to refresh: every place is already colored. The table plays this role. |
| Left-side place panel on desktop | Google/Apple put the card left; Mapwich's left holds the dataset card and filters sidebar. Moving costs more than it gains; Felt and Windy use the right too. |
| Traffic layer | Live data, paid feed. |

### Where Mapwich should beat them

- **Every level at once.** Google's "what's here" gives one address. Mapwich can say the point is in
  *this* block group, tract, city, county, MPO and state, with each one's number and rank. No
  consumer map does this.
- **Honest numbers.** Each value in the card keeps its margin warning (D-359). Google never says
  its 4.8 stars come from three reviews.
- **Time per place.** Windy shows a point's forecast; Mapwich can show a place's 2010 → 2024 path
  for every dataset with a timeline.
- **"From here to there" becomes "this place vs that one".** Right-click → Compare with… turns the
  familiar directions gesture into Mapwich's compare feature.
- **The link is the save.** The URL already holds dataset, place, year and view
  (`lib/url-state.ts`), so saved places and lists are just links, shareable without accounts.

## 4. Bigger "familiar" dreams

**D1. "What's here?" with everything at once.** (Grows A5.)
- *Visitor:* right-click or long-press anywhere, or search an address (A3). A card opens: the pin's
  coordinates; the chain of places it sits in — block group › tract › city/township › county ›
  metro › state — plus **districts**: congressional, state house and senate, school district,
  MPO. Each line shows the current map's value with its rank. Below, "What stands out here": the
  3–5 numbers where this tract is most unusual against its county and state (D-27's place-first
  idea, finally with a home). Links: Street View here, place profile, Compare with…, Copy link.
- *Why weekly:* this is the planner's question in one gesture, and it's "go deeper, not wider"
  (districts are a planned direction).
- *How, at $0:* the Census Geocoder's *coordinates* call (same proxy as A3) returns, in one answer
  checked 2026-10-27, states, counties, county subdivisions, incorporated places, urban areas,
  combined statistical areas, the 120th congressional districts, 2026 state legislative districts,
  tracts and 2020 blocks (block groups and school districts with `layers=all`). The numbers come
  from Mapwich's existing static files (`lib/details.ts`: state/county shards, tract values).
  Fallback if Census is down: the click behavior of today (the current level only).
- *Size:* M for the card on the existing levels (~275k); +S per district type shown with values
  once districts exist as datasets. *Cost:* $0. *Builds on:* A3's proxy, `lib/details.ts`,
  `PlaceDataList.tsx`, the "inside" links, the insight engine for "stands out".
- **Fork candidate:** a printable **site report** for any address (all levels, all topics, margins,
  sources) is what consultants buy from PolicyMap and Esri Business Analyst. Free here as
  education; a polished paid version would be a fork.
- **Sensitive (flag for Robbie):** an address pin that leads with race/ethnicity or income of "the
  people here" can read as steering; U.S. real estate sites avoid showing neighborhood demographics
  for fair-housing reasons. Suggest: the card leads with the current map and the place chain;
  people-category numbers appear only when that category's map is on, and "stands out" skips the
  race/ethnicity datasets. Robbie's call.

**D2. Saved places and lists, no account.**
- *Visitor:* a Save star on every card. A "My places" page lists saved places with the *current
  map's* value for each, side by side, sortable — a watchlist. Lists can be named ("Corridor
  study", "Holmes County trip") and shared as one link that opens the same list for anyone. A
  quiet "new data" dot appears on a saved place when a dataset it uses gets a new year (checked in
  the browser on visit, no email).
- *Why weekly:* Robbie's recurring places become one page he opens every week; it is also the
  natural way into Compare with 3+ places.
- *Size:* M (~250k). *Cost:* $0 (browser storage; the list lives in the URL, so nothing is stored
  on a server). *Builds on:* A8, compare (1.1), `lib/url-state.ts`, `generated/periods.json`.
- **Fork candidate:** email alerts on saved places ("your county's rent burden was updated") need
  accounts and a mail service (~$0–20/month at small scale, more at scale): price it, Robbie decides.

**D3. Home place.** "Make this my place" on any card. The landing map then opens framed on it, and
every dataset card adds one quiet line: "Ramsey County: 31% (state 27%)". S (~80k) on top of D2.
Robbie's weekly use: his county is always one glance away. $0.

**D4. Place timeline on the card.**
- *Visitor:* a card tab "Over time": for every dataset with a timeline, a small line through its
  periods (2010–14, 2015–19, 2020–24; climate 1991–2025; FARS 2015–2024), and "Changed most here
  since 2014" at the top. Margins shown where the change is within noise (the 1.3 rules).
- *Why weekly:* "has it gotten better here?" is the second question after "what is it?".
- *Size:* M (~275k). *Cost:* $0 (reads the timeline values already on R2). *Builds on:* D-36 timeline
  files, change maps (1.2), reliability (1.3). Wording about decline in a place (e.g. "worse") needs
  a neutral template.

**D5. "What in where" search.** Typing "asthma in Duluth", "rent burden Hennepin" or "commute near
me" opens that map framed on that place, the way people type into Google. Both indexes (places,
datasets) already exist in the browser, so a plain split on "in / near / at" plus best match on
each side covers most of it without AI. S–M (~150k). $0. An AI version (any wording, "where do old
people live alone near transit?") belongs to the visitor-AI research; price there.

**D6. Save the map as an image (for slides).**
- *Visitor:* "Save image" in the Share menu downloads a PNG of the view with the title, legend,
  source line and mapwich.org credit, ready for PowerPoint. Felt and Google My Maps users expect it.
- *Why weekly:* planners paste maps into slides every week. High use for Robbie, and every slide is
  quiet publicity.
- *Size:* M (~200k; MapLibre can hand over its canvas after a render; the legend is drawn onto the
  same image). *Cost:* $0. *Builds on:* `ShareButton.tsx`, `MapLegend.tsx`, `MapCredits.tsx`, the
  link-preview image work (1.5).

**D7. Draw an area.** Zillow and Redfin taught people to trace a shape. Here: draw a corridor or a
neighborhood and get totals (people, jobs, households) and averages for it. This is parked #292
(focused-area totals) reached by a familiar gesture. L (~500k; area weighting from blocks or
tracts). $0 if computed in the browser from static files; check the size of block data first.

**D8. Field mode (phone).** With My location on, the card follows you: walk or ride, and the
tract/block group card updates as you cross lines (Strava's moving map feel). S (~80k) once A5 and
A6 exist. Fun for Robbie on site visits; low priority.

## 5. Top 10

Ranked by Robbie's weekly use first, then by cost. Tokens are build estimates; all run at $0/month.

| # | Idea | Size (tokens) | Familiar from |
|---|---|---|---|
| 1 | **"What's here?"**: right-click/long-press shows every place and district the point is in, with values (A5 → D1) | M, ~275k (+S per district type) | Google, Apple, Windy |
| 2 | **Address and coordinate search** that answers "which tract/block group?" (Census Geocoder via a tiny proxy) (A3) | S–M, ~150k | Google, Zillow |
| 3 | **Search box in view, recents, nearby first** (A1 + A2) | S, ~120k | Google, Apple |
| 4 | **Save the map as an image** with legend and source, for slides (D6) | M, ~200k | Felt, My Maps |
| 5 | **Measure distance and area** (A7) | S–M, ~120k | Google, Felt |
| 6 | **Saved places, lists by link, home place** (A8 + D2 + D3) | M, ~300k | Google, Zillow, Redfin |
| 7 | **Place timeline on the card** (D4) | M, ~275k | Windy, Zillow price history |
| 8 | **Phone sheet with a half stop and one action row** (A4) | S, ~90k | Google, Apple |
| 9 | **"What in where" search** ("asthma in Duluth") (D5) | S–M, ~150k | Google |
| 10 | **My location** (A6) | S, ~60k | every phone map |

Also worth doing when nearby: keyboard `?` sheet (A9, S ~50k), "Go to" icon fix (A10, XS), USGS
imagery base map (A11, M ~200k), bottom time scrubber (A12, S–M ~120k), draw an area (D7, L).

**Rough total for the top 10: ~1.75M tokens.** A natural "Familiar map" next-phase bundle is #2, #3,
#8, #10 (all S, ~420k together) plus #1 (M): the visitor's first ten seconds then match Google.

**Fork candidates:** address site report (D1); email alerts on saved places (D2).

**Wording about people or sensitive topics (send to Robbie):**
- D1 / A3: an address pin showing who lives "here" (race, income) can read as neighborhood
  steering. Proposed default: lead with the current map and the place chain; people numbers only
  when that map is on; "stands out" skips race/ethnicity.
- A6: the location prompt's wording ("Your location stays on this device").
- A3: the one-line notice that typed addresses go to the Census Bureau.
- D4: templates for "changed most" must stay neutral (no "worse"/"declining" about a community).

## Sources

- Google Maps keyboard shortcuts: https://support.google.com/maps/answer/6396990
- Google Maps measure distance (right-click → Measure distance): https://support.google.com/maps/answer/1628031
- Google Maps coordinates via right-click: https://support.google.com/maps/answer/18539
- Felt keyboard shortcuts (0 reset, F fit, copy-link chord): https://help.felt.com/getting-started/keyboard-shortcuts
- Felt interface and measure tool: https://help.felt.com/getting-started/tour-the-interface, https://help.felt.com/field-app/tour-the-field-app.md
- Redfin draw-your-own-search: https://redfin.com/blog/2015/03/draw-your-own-search-on-the-redfin-iphone-app.html
- Zillow draw boundary (GeekWire 2011): https://www.geekwire.com/2011/zillow-app-draw-search-map/
- Map-first real estate UX write-up: https://raw.studio/blog/using-maps-as-the-core-ux-in-real-estate-platforms/
- Windy picker and timeline (community): https://community.windy.com/topic/27232/windy-39-is-here-learn-how-to-masterclass-new-features/?page=1
- Apple HIG, Maps (page body didn't load via fetch; general guidance from knowledge): https://developer.apple.com/design/human-interface-guidelines/maps
- U.S. Census Geocoder (tested 2026-10-27, address and coordinates calls): https://geocoding.geo.census.gov/geocoder/
- USGS National Map imagery service: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer
