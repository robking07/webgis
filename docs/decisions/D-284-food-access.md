# D-284 · Food access: the 2019 atlas on its own 2010 tracts, county roll-ups from tract counts

- **Date:** 2026-10-12
- **Status:** PROPOSED (worker defaults; Robbie decides at review)
- **PR:** #184

**Which edition.** USDA ERS now publishes two maps in the Food Access Research Atlas. The 2019
*Large Retailer Access Map* (LRAM, the old atlas, released April 2021) measures distance to
supermarkets, supercenters and large grocery stores, on **2010 tracts**. The *SNAP-authorized Retailer
Access Map* (SRAM, first released July 2026) measures distance to **any store that takes SNAP**
(convenience and dollar stores included), on 2020 tracts with 2020 Census and 2020–2024 ACS data. The
issue asked for supermarket access, so this PR maps the 2019 LRAM. ERS expects the next LRAM in winter
2026–27. The SRAM measures something else (far fewer people are "far" from any SNAP store), so it is
not a newer vintage of the same map.

**Tract boundaries (follows CEJST).** The atlas's tracts are 2010 tracts, and the app draws a
choropleth's default view on 2020 tracts only. Matching by code would leave 27% of 2020 tracts blank
(61,121 of 84,119 codes match), and a code kept across a small boundary fix would compare different
areas. So, as for CEJST, the tract maps are **feature layers drawn on the 2010 tract shapes** (Census
2019 cartographic boundaries, which are the 2010 tracts), with every value as USDA published it:

- `food_access_tracts`: colored by the share of residents far from a supermarket;
- `food_access_no_car_tracts`: colored by the share of households with no car more than ½ mile away;
- both carry a **Low income and low access** facet (`LILATracts_1And10`, the food desert flag), so
  showing only those tracts is the flag map, and a click explains the distance rule, the low-income
  and low-access tests and both shares.

The `features` ingest gains an optional `join` table: the tract shapes and the atlas CSV are loaded
into one GeoPackage and joined there (about 10 s; joining the zipped CSV directly took 4 minutes for
DC alone).

**County and state (new `food_access` kind).** Each is a sum of tract counts over a sum of tract
totals, summed by the 2010 tract's state and county:

- `food_desert_residents` = Σ `Pop2010` in tracts with `LILATracts_1And10` = 1 ÷ Σ `Pop2010`;
- `far_from_supermarket` = Σ (`lapop1` in urban tracts, `lapop10` in rural tracts) ÷ Σ `Pop2010`;
- `no_car_far_from_supermarket` = Σ `lahunvhalf` ÷ Σ `OHU2010` (USDA's `lahunvhalfshare` is this ratio).

A `NULL` count in the atlas means no one lives beyond that distance, so it counts as 0 (`lapop1` is
NULL exactly where USDA's 1-mile share is 0). Connecticut's 2010 counties don't match its 2022
planning regions, so its counties show no data; renamed counties (Oglala Lakota, Kusilvak) follow
`FIPS_RENAMES`.

**USDA's blanks in renamed counties.** In four tracts (one in Kusilvak, AK, three in Oglala Lakota, SD,
both renamed in 2015) USDA's combined `LAPOP1_10` and the flags built from it are blank or 0 although its own `lapop1`
and `lapop10` counts are there, and three Oglala Lakota tracts have no income data, so they are
published as not low income. `lapop1`/`lapop10` equal `LAPOP1_10` in every other tract, so the far
share uses them (Oglala Lakota: 34% of residents far, not 0%). The flags stay as USDA published them;
the tract card leaves "Low-income tract" blank where USDA had no income data instead of saying No.
