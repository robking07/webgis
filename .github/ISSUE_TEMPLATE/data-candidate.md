---
name: Data candidate
about: A dataset proposed for Mapwich (usually filed by the weekly scout). See docs/data-intake.md.
title: "Data candidate: <dataset name>"
labels: data-candidate
---

**Verdict:** Recommend | Hold (question: …) | Not recommended
**Value:** n/5 · <one sentence why>

## What it is
- **Publisher / maintainer:** <name> · <url>
- **Measures:** <what, universe, unit>
- **Time span / latest vintage / cadence:**
- **Format and access:** <download / API (key?) / size>

## Screen
| Check | Finding |
|---|---|
| License | <quote the actual terms, with link> · share-alike? · fits non-commercial educational use (D-30)? |
| Provenance | <who collects it, how; archived mirror and since when> |
| Privacy and safety | <identifies people/homes/victims/real-time locations? aggregated?> |
| Geography | <point/line/polygon/state/county/tract/…; how it joins to GEOIDs> |
| Quality | <method, known gaps and biases> |

## Fit on the map
- **Treatment:** <choropleth by county / points with facets / …>
- **Pairs with:** <existing Mapwich datasets>
- **Sanity check to run:** <a published total or ranking to compare against>

## Robbie
Add `approved`, `needs-license`, or `declined` (with a comment why).
