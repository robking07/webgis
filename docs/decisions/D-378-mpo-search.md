# D-378 · Metropolitan Planning Organizations in search

- **Date:** 2026-10-19
- **Status:** DECIDED (lead), defaults noted below
- **PR:** #278 (issue #276)

Search lists Metropolitan Planning Organizations as places, labeled "MPO" ("Metropolitan Council ·
MPO"); typing "MPO" lists them too. Picking one outlines the whole area with the same selection
outline a clicked place gets (same `packages/design` theme colors and widths, from one GeoJSON
source), fits the map to it, and names it with the states it covers ("Metropolitan Council · MN")
where a focused place's name shows, with the same × to clear it. A click on the map never selects
an MPO. The share URL carries it as `mpo=<MPO id>`, its own parameter so it can't be read as a
county or tract id. No data values and no details panel yet.

Data: BTS NTAD Metropolitan Planning Organizations (USDOT, public domain), 411 MPOs.
`npm run ingest -- mpo` (`data/ingest/src/mpo.ts`) pages through the FeatureServer, has the server
simplify the shapes (about 200 m), and works out the states each MPO covers by intersecting it with
Census 2024 state outlines (a state counts at 2% or more of the MPO's area, which drops border
slivers; the source names only one state). It writes `apps/web/public/mpo/index.json` (search rows)
and one shape file per MPO, about 1.2 MB in all, committed and served by the site, so no R2 upload.
Shapes load only when one is picked or linked.

Defaults taken: the outline only, no fill (a clicked place gets no fill either); the name shows the
states after a dot; picking an ordinary place in search clears the MPO.

Lead: static files in public/, rows merged into the place index · Ponytail: AGREE (reuse the row
shape; one GeoJSON source for the highlight) · Outcome: adopted.
