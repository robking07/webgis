# D-387 · EPA Toxics Release Inventory: pounds released on site per square mile

- **Date:** 2026-10-20
- **Status:** DEFAULTED (worker, for the lead to confirm)
- **PR:** #287

The TRI map (`tri_onsite_releases`, issue #171) shows each county's and state's **on-site releases,
reporting year 2024, in pounds per square mile of land**.

- **Per square mile, not per resident.** Releases happen at a place, not to people, and dividing by
  residents makes near-empty mining counties look extreme (Northwest Arctic Borough, AK: about
  724 million lb from the Red Dog mine for about 7,800 residents). Per square mile puts small
  places with one big plant and the big-mine counties on top (Covington city, VA, then Salt Lake
  County, UT; checked with Census Gazetteer land areas). A plain total in pounds was the other
  option; it mostly maps county size and mines.
- **On-site only.** Air, water, underground injection and land disposal at the facility
  (`ON-SITE RELEASE TOTAL`). Off-site transfers are left out, so nothing is counted twice when one
  TRI facility ships waste to another.
- **Zero where no facility reports.** Roughly a quarter of counties have no reporting facility. They map as 0,
  the lightest class, and the coverage note says zero means "no reporting facility", not "no
  pollution".
- **Dioxin rows (grams) are left out** of the pounds, as EPA does.
- **County codes** come from Envirofacts `tri_facility` (`state_county_fips_code`), because the
  Basic Data File has county names only. That table also holds contact names, phones and emails; the
  ingest reads it in memory, keeps only the facility id and code, and never caches it.
- **Connecticut counties show no data:** EPA still uses CT's pre-2022 counties. The state total
  includes CT.
- **Kept out of Combinations** (`excludeFromInsights: true`), so playful pairings never put "toxic
  releases" next to a cancer or asthma rate as if one caused the other.

Not done: the facilities as a point layer. The map has no point styling for `features` layers yet
(only lines and areas), so that needs UI work and is a follow-up.
