# D-361 · Transit routes layer (#176, PR 1)

- **Date:** 2026-10-17
- **Status:** DECIDED (Robbie, 2026-10-16, for the plan) / DEFAULTED (worker, for the details below)
- **PR:** #261

## Robbie's calls (issue #176, 2026-10-16)

1. **Comparing transit between places:** Census urban areas (UZAs), clearly labeled, for the later
   NTD measures (PR 2a/2b). Not metro areas, and NTD numbers never spread onto counties or tracts.
2. **Routes:** an overlay on the transit-commute map (`pct_transit_commute`), not a standalone
   national route map.
3. **Minnesota bus-frequency pilot:** yes, after PRs 1 and 2.
4. **Stops:** rail stations only, at first (not in this PR).

## What this PR does

- **Source:** BTS National Transit Map Routes (NTAD), compiled 2026-09-23 from agencies' GTFS
  schedules. ArcGIS item `985bf490e9fa462f80b1cb8ad5f6e139`; download through geodata.bts.gov's
  file-geodatabase export. **License: CC BY 3.0 US** (the item's own license field), with
  attribution to USDOT/BTS and the agencies BTS names (City of Lawndale; Via Mobility Services).
  Recorded in the entry's `license`.
- **Agency service:** FTA National Transit Database, "NTD Annual Data View - Service (by Agency)"
  (`data.transportation.gov` `6y83-7vuw`), report year 2025, joined on the 5-digit NTD id every
  route carries. Public domain. Gives the agency name (BTS routes carry only GTFS agency ids),
  its main urban area, yearly boardings (unlinked passenger trips) and vehicle revenue hours.
  These describe the whole agency, and the labels say so ("Agency's yearly rides").
- **Mode:** GTFS `route_type` grouped into six kinds, which are the facet, the color and the rank:
  1 subway or metro (incl. monorail), 2 light rail or streetcar (incl. cable car), 3 commuter or
  intercity rail, 4 ferry, 5 bus (incl. trolleybus), 6 other or not stated.
- **Color:** the Okabe–Ito categorical ramp from `packages/design` (already certified for
  color-vision deficiency), added to the registry's allowed ramps. One color per kind via manual
  breaks on the kind code.
- **Simplification and size:** the repo's line settings in `features.ts` (tippecanoe
  `--simplification=6`, drop-densest-as-needed), zooms 2–12, plus the rank filter: rail and
  ferries at every zoom, buses from zoom 7, where a metro's network reads as one. Size in the PR.

## Small code changes (ingest only)

- `features.ts`: a `join` may now be a plain CSV (no `path` inside a zip), for Socrata exports.
- `util.ts` `cached()`: refuses a 202 reply, which ArcGIS Hub returns while it is still building an
  export; caching it would leave a JSON message in place of the zip.

## Open (needs UI, filed by the lead)

- Drawing this layer on top of the transit-commute choropleth: the viewer shows a feature layer
  only when it is the primary dataset.
- The legend for a categorical feature layer: today it prints numeric ends ("< 2", "≥ 6"), not the
  six kind names; and line captions say "segments · wider lines = higher road class".
