# D-279 · "Why this matters": sourced context on maps

- **Date:** 2026-10-12
- **Status:** IN PROGRESS. Placement, wording and the approval rule were decided by Robbie (2026-10-06,
  #103/#104); the format and the preview switch are worker defaults. No text is approved yet.
- **PR:** #179 (issue #115, PR 1 of 2)
- **Follows:** D-25/D-26 (map-first), D-135 (menus by screen size), D-115 (Specials as content files)

## What visitors see

- A quiet "Why this matters ›" link on the dataset card, only on maps that have **approved** context.
  Laptops and monitors: its own line under the meta line. Phones: its own line under
  "Compare datasets · Table · About", which has to stay one line at 360 px (D-135 amendment), so the
  phone card grows by one line on these maps only.
- Closed by default. Laptops and monitors: a panel on the right, where place details open; the map
  shifts left by the panel's width while it is open (map padding) and back when it closes.
  Phones: the bottom sheet the details use, peeking with the summary; swipe up for the rest.
- In order: the summary (two or three sentences), a list under a heading set by the framing, linked
  maps (tap to switch), the numbered sources, then "How this map is measured: About this data →", the
  line between the two: About says how the number is made, this says why the pattern matters.
- Every `[n]` renders as a superscript linking straight to source n.
- Not shown: on comparisons (two maps), on the zoomed-in heading, or anywhere a map has no context.
  Opening a place, the dataset list or the phone table closes it; switching maps closes it.
- No Special row yet; it will appear when a Special is published (lead's call).

## The format

One file per map: `apps/web/content/context/<dataset id>.yaml`.

```yaml
approved: false            # Robbie flips this; only true reaches mapwich.org
framing: preventable-harm  # preventable-harm | risk-factor | disparity
reviewed: "2026-10-12"     # numbers last checked against the quotes
review_by: "2028-04-12"    # at most 18 months after reviewed
summary:                   # each line cites with [n] = sources[n-1]
  - "Nationally, in 2023, 40,901 people were killed in motor vehicle crashes on U.S. roads.[1]"
points: [...]              # shown under the framing's heading
linked:                    # other registry maps, with a neutral reason
  - { id: vmt_per_capita, why: "Miles driven per resident" }
sources:
  - title: "NHTSA, Overview of Motor Vehicle Traffic Crashes in 2023 (DOT HS 813 705, April 2025)"
    url: https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813705
    quotes: ["… a 4.3-percent decrease from 42,721 in 2022 to 40,901 in 2023."]
```

Framing headings: preventable-harm "What's behind it"; risk-factor "What it's linked to";
disparity "Who is affected more".

Content lives beside the Specials (`apps/web/content/`), not in the registry: it is editorial text
with its own approval, not a property of the dataset, and adding a dataset still needs no UI code.

## Checks (they stop the build)

`apps/web/src/lib/context-load.mts`, run by `scripts/prepare.mts` before every dev and build:

- The file name is a registry dataset; every field is known; dates are ISO; `review_by` is after
  `reviewed` and at most 18 months later. Past `review_by`, the build prints a warning.
- Every summary and point line cites at least one source, every `[n]` exists, every source is cited.
- **Every number in a line** (digits, so years too) must appear as a whole number in a quote of a
  source that line cites. Numbers written as words ("one in five") aren't checked; keep figures in digits.
- A `disparity` map never uses the word "preventable" (Robbie, 2026-10-06).
- Linked maps exist in the registry and aren't the map itself.

Unit tests: `apps/web/src/lib/context-load.test.ts`. The quotes themselves are copied by hand from the
source; the check proves the numbers match the quotes, not that the quotes match the page.

## Approval gate and the preview switch

- Production builds (`VERCEL_ENV=production`) write only `approved: true` context into
  `src/generated/context.json`, so draft text never reaches mapwich.org, even in the JavaScript.
- Every other build (local, CI, Vercel previews) carries the drafts, and they show only with
  `?context=preview` in the map URL, with a "Draft · not approved" badge. Approved context shows
  without the switch everywhere.
- To publish: Robbie edits the copy in `drafts/site-copy/why-this-matters-<map>.md`; the text is copied
  into the YAML verbatim, numbers rechecked, and `approved: true` set in a PR.

## Defaults for Robbie's review

- The phone link sits on its own line (the card grows one line on these maps).
- The framing headings above, and the "Draft · not approved" badge in previews.
- Sources link out; superscripts link straight to the source rather than to the list at the bottom.

## Tests

`apps/web/e2e/context.tests.mjs`: laptop panel (citations link to sources, map padding on open and
reset on Esc, the About line), a linked map switching and closing the panel, the phone sheet leaving
the map visible, and no link on a map without context or on a draft without the switch.
