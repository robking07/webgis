# D-557 · Data run: margins and counts for ACS maps

- **PR:** #457 (closes #454). Extends D-478 (the Data run) and D-552. Unblocks #188 (real margins on change maps).

**Problem.** The earlier-year margins (`values/<id>/<stop>/<level>.moe.json`, D-257) were never published: `ingest counts` writes them, but it ran only on Robbie's machine, and the Data run refused `counts` (listed as needing GDAL or tippecanoe). So `values/median_household_income/2019/county.moe.json` is a 404 while `2019/county.json` is live.

**What `counts` needs, for ACS maps.** `CENSUS_API_KEY`, `SUPABASE_DB_URL` (read only: land areas from `geographies`), and downloads it caches itself (2019 Gazetteer files for pre-2020 periods, the 2024 block-group shapefile's `.dbf` for block-group land area, read in JS). No GDAL, no tippecanoe, no local tiles: with nothing on disk, its tract and block-group shards hold only the series it just loaded. Non-ACS sources (census2020, ddp287g, LODES, FARS, TRI) aren't needed for #188 and stay local.

**Decided.** A new step value `counts`, allowed only alone and typed exactly (like `features`), and only for `acs5` maps (`data/ingest/src/check-run.ts`). The run does `ingest counts <ids>` (writes margins for every period, the default period's counts files and U.S. rows, and the count shards; no database writes, no value files), then `publish-reload`. No `export-values`, `details` or `similar`: nothing they read changed.

**Why it can't shrink live data.** `publish-reload` merges each local shard (`values/counts/tract|block_group/<county>.json`) into the live one, swapping in only the reloaded series, and stops before any upload if a county would lose one, including live counties this run wrote no file for. Then `publishJson`'s `uploadProblems` re-checks every changed shard against R2. `ALLOW_TRACT_DROP` is set only from the run's input. Ids are required: an empty `datasets` would run every source, so it's refused.

**Inputs for every ACS change map** (52 maps with a `timeline`; earlier stops 2014 and 2019, one map 2019 only): steps `counts`, datasets:

```
gini_index labor_force_participation mean_commute_minutes median_age median_gross_rent median_home_value median_household_income median_owner_costs_mortgage pct_age_65_plus pct_aian_nh pct_asian_nh pct_bachelors_plus pct_bike_commute pct_black_nh pct_carpool pct_child_poverty pct_disability pct_drive_alone pct_extreme_commute pct_foreign_born pct_graduate_degree pct_hispanic_latino pct_leave_before_7am pct_limited_english pct_long_commute pct_mobile_homes pct_moved_last_year pct_multiracial_nh pct_nhpi_nh pct_no_hs_diploma pct_overcrowded pct_owner_cost_burdened pct_people_of_color pct_poverty pct_public_assistance pct_rent_burdened pct_renter_households pct_seniors_living_alone pct_single_parent_families pct_snap_households pct_transit_commute pct_under_18 pct_uninsured pct_veterans pct_walk_commute pct_white_nh pct_work_from_home pct_work_outside_county pct_zero_vehicle_households per_capita_income population_density unemployment_rate
```

**Margins and counts are drop-checked too.** `uploadProblems` now treats a map's `[<stop>/]{state,county}.moe.json` and `{state,county}.counts.json` like its `state.json` and `county.json`: fewer places than the live file refuses the whole upload, unless `ALLOW_TRACT_DROP=1`. This also covers a local `publish-counts`. So a short Census response can't shrink a live margin file.

**Limits.** `us.json` (one row) and `tract.moe.json` aren't drop-checked. A parts set's remainder series is rewritten only when every member is named; otherwise the live one is kept by the merge.
