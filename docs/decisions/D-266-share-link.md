# D-266 · Share button: copy the exact view

- **Date:** 2026-10-11
- **Status:** PROPOSED (worker default; the lead shows Robbie a screenshot before merge)
- **PR:** #166 (issue #164)
- **Follows:** D-25/D-26 (map-first, chrome falls away), D-135 (menus respond to screen size)

Robbie picked a copy-link button from the Watermelon UI shortlist (`copy-confirm`). Rebuilt with our
`Button`, lucide `Share2`/`Check` and the design tokens; no new dependency.

## What it does

- Copies the page URL. The URL already holds the whole view (`lib/url-state.ts`: dataset, place,
  year, `since=`, zoom; the compare page's places and metric), so there is no separate share format.
- Then shows a checkmark and "Link copied" for 2 seconds, announced through a `role="status"` region.
- Touch screens (`pointer: coarse`) with the Web Share API open the native share sheet instead.
  Laptop Chrome and Safari also have the API; they copy, so a laptop click never pops a system sheet.
- No clipboard (insecure page, permission refused): a prompt shows the link selected, ready to copy.

## Where it sits

On the dataset card, not in the map controls. The card already falls away when the visitor is
immersed (D-25), so Share adds no new floating chrome; the controls column on phones is empty (no
zoom pill), and a new floating button there would be the heaviest option.

- Phones: the right side of the card's category row, as a link. The actions line under the meta
  ("Compare datasets · Table · About") must stay one line at 360 px (D-135 amendment), and "Link
  copied" would not fit there.
- Laptops and monitors: a bordered button in the card's action row, after "About this data".
- Compare page: the right end of the "← Back to the map" line.

## Code

`components/ShareButton.tsx`, `map-page/DatasetCard.tsx`, `compare/ComparePlaces.tsx`;
tests `e2e/share.tests.mjs`.
