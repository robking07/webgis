# D-556 · U.S. value on 2020 Census, traffic deaths, jobs and food access maps

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker, issue #296)
- **PR:** #456

Closes #296. `US_KINDS` (D-395) now also lists `census2020`, `fars`, `lodes` and `food_access`; their `values/<id>/us.json` files are published (or written by the ingest, below).

- **Jobs (`lodes`):** the U.S. value was null because LODES publishes no Alaska file after 2016, so `sumStates` was unknown. The U.S. row now sums the states LODES has and divides by the land area of those same states, so it is still jobs per square mile of the places counted. Alaska is left out of both (about 0.2% of U.S. jobs).
- **Food access:** the ingest already computed the U.S. share and only logged it; it now writes `us.json` (value only, no counts).
- A map whose `us.json` is missing or has a null value shows no U.S. figure (`usValue` returns null; unchanged).
- Data takes effect after a Data run on main: `steps=lodes food-access` (`datasets=job_density` for lodes; food-access ids: `far_from_supermarket`, `no_car_far_from_supermarket`, `food_desert_residents`).
