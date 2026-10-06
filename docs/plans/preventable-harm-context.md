# Plan: context for maps of preventable harm

Issue #104 (parent #103). Status: **plan and prototype for review; build in Phase 2.** Prototype on
draft PR #113 (`ui/preventable-harm-mockup`), not for merge. Every context text in the prototype is a
draft written by Claude from the cited sources. Nothing shows on the live site until Robbie approves it.

## 1. Which maps qualify

**Rule.** A map qualifies when it measures one of these, and a reputable public source (CDC, NHTSA,
FHWA, Surgeon General, peer-reviewed review) says in its own words that the harm is largely
preventable:

1. deaths or serious injuries (counts or rates);
2. a disease outcome; or
3. a behavior or exposure that the source names as a leading cause of death or disease.

Demographics, income, housing, commuting and climate maps don't qualify, even when they correlate
with harm. They can still be *linked maps* from a qualifying map. A comparison (two maps) never shows
the context, because it is about the pair, not one map.

**Current registry (60 datasets):**

| Verdict | Datasets | Why |
| --- | --- | --- |
| Qualifies | `traffic_fatalities` | Deaths. CDC: crash deaths "are preventable". |
| Qualifies | `smoking` | CDC: "the leading preventable cause of disease, death, and disability". |
| Qualifies | `obesity` | CDC links it to heart disease, stroke, type 2 diabetes. Needs sourcing (and care with the wording). |
| Qualifies | `physical_inactivity` | CDC lists inactivity as a major chronic-disease risk factor. Needs sourcing. |
| Qualifies | `binge_drinking` | CDC attributes excessive-drinking deaths. Needs sourcing. |
| Borderline (Robbie) | `short_sleep`, `loneliness` | Linked to chronic disease and early death (CDC; 2023 Surgeon General advisory on loneliness), but the "preventable" framing is weaker. |
| Borderline (Robbie) | `pct_uninsured`, `bridges_poor_condition` | A system failure, but not itself a harm. Better as linked maps. |
| No | the other 51 | Descriptive (population, income, housing, commuting, jobs, climate, race and ethnicity), plus CEJST and 287(g), which carry their own framing. |

The registry has no heart-disease, lung-cancer or other disease-outcome map yet. When CDC PLACES
outcomes (e.g. coronary heart disease, COPD) are added, they qualify under rule 2.

## 2. What the context contains

Short. A visitor should get it in one tap and about 20 seconds.

- **Summary:** two or three plain sentences: the harm, its national scale, and that it is largely
  preventable, in the source's words. No advocacy and no bare numbers.
- **What's behind it** (a harm) or **What it leads to** (a behavior): three or four bullets, each
  with a cited number where the source gives one.
- **Linked maps:** two to four Mapwich maps, each with a neutral reason ("How much residents
  drive", "Same CDC survey"). They are not causal claims.
- **Special:** a link when one exists (traffic: #105). Otherwise the row is absent.
- **Sources:** a numbered list. Each statement ends with a superscript number that jumps to it.
  Only primary public sources, with publication and date. No figure without a source.

## 3. Where it appears (map-first)

Closed by default, and the map looks exactly as it does today. The only addition is one quiet text
link, **"Why this matters ›"**, on the dataset card, and only on qualifying maps.

- **Laptop and monitor:** the link gets its own line under the source line (+30 px on the card).
  It opens a 320 px panel on the right, in the same place as place details. The map and legend stay
  visible. It closes with ×, Esc, clicking a place, or switching maps.
- **Phone:** the link joins the existing "Compare · Table · About" line, so the card stays the same
  height. It opens a bottom sheet that peeks with the summary (the map stays visible above). Swipe
  up for the bullets, linked maps, Special and sources.
- **Immersed (after zooming):** the card falls away, and the link with it. An open panel stays open.

**Options considered** (screenshots in the review page):

- **A (recommended): the card link plus a side panel or bottom sheet.** It reuses the place-details
  pattern.
- **B: the context opens inside the dataset card.** Simpler, but on phones it covers most of the
  map, and on laptops it runs into the legend.
- **C: the link at the foot of the legend.** The legend stays when the page immerses. But on phones
  the legend is a strip, so the link is hidden until the strip is tapped open.

## 4. Linking maps and Specials

A linked map is a button that switches the dataset (the same as picking it from the list), so the
URL, year and Back all keep working. The panel closes on the new map unless that map qualifies too.
A Special links one way, from the context to the piece. The Special's own inline maps already link
back to the map.

## 5. Where the content lives

One Markdown file per dataset in **`apps/web/content/context/<dataset-id>.md`**: front matter for
`status: draft | approved`, `approved` (date), `linked`, `special`, `sources`, and the body for the
summary and bullets. Why not the registry: the registry is data facts (adding a dataset = registry +
ingest, no UI). This is editorial text Robbie approves, like Specials (D-115), and Markdown is easy
for him to edit. `scripts/prepare.mts` reads the files into `generated/context.json`, as it does for
Specials. The build fails when:

- the dataset id or a linked map is unknown;
- a `[n]` has no source; or
- a source has no URL.

Only `approved` files ship to production. Drafts show on previews only, with the DRAFT badge.

## 6. Size of the real build

**M, about 250–300k tokens** for one worker:

- loader and checks in `prepare.mts`, with unit tests;
- productionize the panel and sheet (from this prototype), plus e2e cases at three sizes;
- drafts for the 5 qualifying maps, with sources checked.

Robbie's review of the wording is a separate step. The traffic Special (#105) is its own task.
