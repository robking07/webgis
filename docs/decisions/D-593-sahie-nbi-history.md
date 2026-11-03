# D-593 · Uninsured back to 2008, bridges in poor condition back to 1992; VMT stays at 2024

PR #493, part of #479. Registry + ingest only; same measures as before, one stop per year, state and county.

- **`uninsured_under_65` (SAHIE): 2008 to 2024**, 2024 stays the headline. SAHIE switched from the CPS to the
  ACS in 2008 and the Census Bureau advises against comparing 2008-on estimates with 2005 to 2007 (which are
  not in the same file series either), so the timeline stops at 2008. Same CSV per year, read by the same parser.
  SAHIE uses the counties of each year, so stops before 2022 use 2019 boundaries (not 2020 like other maps):
  Connecticut's old counties run through 2021 and show that way; Chugach and Copper River (split in 2019) show no
  data for 2020 and 2021. Renamed counties take today's code; Bedford city, VA (merged 2013) is dropped while
  Bedford County has its own rate, as the ACS timeline does.
- **`bridges_poor_condition` (NBI): 1992 to 2025**, 2025 stays the headline. FHWA's `BRIDGE_CONDITION` and
  `DECK_AREA` fields start in 2019; earlier years derive both from the items exactly as FHWA does (lowest of
  items 58, 59, 60, 62 at 4 or below; item 49 x 52, or x 32 when 52 is 0). Check: the derived values match FHWA's
  own fields on all 617,084 highway bridges in the 2019 file. FHWA's own pre-2019 state tables (2012 to 2016)
  counted culverts as zero deck area; with that rule our counts and areas match those tables exactly (Minnesota
  2016: 13,355 bridges, 776 poor, 4.62%; California 2012: 24,812, 2,862, 15.65%). We keep the 2019-on rule for
  every year so the series stays one measure, which puts older states a little off FHWA's old tables (Minnesota
  2016 4.40%, California 2012 15.54%). Puerto Rico is missing from the 2002 to 2005 files. Files are FHWA's one-file highway bridge downloads
  (`<year>hwybronlyonefile.zip` before 2018), the same delimited columns back to 1992; about 50 MB each, so a full
  run keeps about 1.6 GB in `data/cache`. 1992 is the first year FHWA posts.
- **`vmt_per_capita` stays 2024 only.** FHWA publishes no consistent county series of past HPMS road sections:
  BTS NTAD carries only the latest year, FHWA's own spatial page lists only 2018 (per-state feature services),
  and each year is a separate multi-GB geodatabase that needs GDAL, which the Data run doesn't have for `vmt`
  (check-run.ts). FHWA's state VMT tables (Highway Statistics VM-2) count all roads, not the sampled sections we
  sum, so they are a different measure and are not mixed in. More than half a day of work; left out.

Amendment 2026-11-02 (Robbie): coverage note adds the 2014 sentence, approved as written (drafts/site-copy/uninsured-2014-sentence.md).
