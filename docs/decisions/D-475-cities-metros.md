# D-475 · Cities and metro areas: search one, see its official numbers

- **Date:** 2026-10-28
- **Status:** DEFAULTED (worker, issue #332, under the plan Robbie approved 2026-10-28; the lead decides)
- **PR:** #375

**Decided.**

1. **What.** Incorporated places (cities, towns, villages, boroughs; no CDPs yet) and metro and micro
   areas (CBSAs) show the Census Bureau's own published ACS 5-year value and margin of error for the
   maps that opt in. Never a map level: no national city choropleth, no tiles, nothing on screen until
   one is searched (D-25/D-26). Default period only (no change over time).
2. **Which maps.** Registry field `areaLevels: [cbsa, place]` (acs5 only, not per-square-mile; `load.ts`
   refuses others). Eight opt in: median household income, poverty, median home value, median gross
   rent, bachelor's degree or more, rent burdened, unemployment rate, median age. Any other map says
   "*Map*: not available for metro areas / cities and towns" rather than borrowing a county number
   ("not available", not the issue's "not published": the Census Bureau does publish many of those
   tables for metros; Mapwich just doesn't carry them yet).
3. **Tagged codes (foundation fix 1).** Only the new types get one: `cbsa33460`, `place2743000`. The
   URL carries it as `area=<code>`; GEOID lengths, today's links and `mpo=` are unchanged. A tagged
   code can never be read as a county or tract.
4. **Data.** `npm run ingest -- areas` (`data/ingest/src/areas.ts`): values through the existing ACS
   fetch and `derive` (CBSA in one call per variable batch, places one call per state); outlines from
   TIGERweb's ACS 2024 layers (January 1, 2024 boundaries, the vintage the 2020–2024 ACS uses),
   simplified by the server (~200 m metros, ~50 m places). One file per area on R2,
   `areas/<code>.json` = `{ v: { dataset: [value, moe] }, g, b }`, plus `areas/index.json` (935 metro and
   micro search rows). About 20,660 files, 27 MB before gzip. `publish-areas` uploads only `areas/`.
5. **Search.** Metro rows read "Minneapolis-St. Paul-Bloomington, MN-WI · Metro area". "Minneapolis
   metro" (or "… micro area") lists metros first; en and em dashes match hyphens. City rows in
   `geo/search.json` carry their code once `ingest search` re-runs (Gazetteer FUNCSTAT not "S").
6. **On screen.** Picking one frames it (as any searched place), outlines it with the MPO highlight
   (one GeoJSON source, design tokens), names it under the heading with ×, and shows a small panel:
   the map's title and period, value ±margin, benchmarks (a city: its state and the U.S.; a metro: the
   U.S. only, as metros cross states), and the existing reliability note. Comparing two maps lists both.

**Not done here (later, if wanted):** comparing two metros or cities, a city inside one county showing
that county's number labelled, CDPs, townships, CDC PLACES at places, a metro map level, a place
page or CSV for areas.

Lead: — · Ponytail: — · Outcome: pending review.
