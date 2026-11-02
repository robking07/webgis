# D-581 · ACS maps reach back to 2005–2009, at state and county

- **Date:** 2026-11-01
- **Status:** DEFAULTED (worker, issue #479, wave 1; plan by lead + ponytail vote)
- **PR:** #481

37 ACS 5-year timeline maps now run `{ from: 2009, to: 2024, step: 5 }`: 2005–2009, 2010–2014,
2015–2019, 2020–2024. Stops stay non-overlapping, since overlapping 5-year windows overstate change.
Older dollars are still restated into 2024 dollars with CPI-U (D-36). The 2009 annual average,
214.537, is the mean of BLS series CUUR0000SA0 for January to December 2009.

The 2005–2009 stop has **state and county only**. Its tracts are 2000 tracts, and the older
boundary tiles hold 2010 tracts, so the timeline ingest skips tracts for periods before 2010. The
web app already limits a stop to the levels it has (`periods.json`). The 2009 counties match the
2019 county tiles exactly (3,220 each) once `FIPS_RENAMES` is applied. Bedford city, VA (51515),
which merged into Bedford County (51019) in 2013, is dropped rather than written over the county:
the 2005–2009 Bedford County value excludes the city.

14 maps keep 2014 as their first stop because their tables aren't in the 2005–2009 release
(education B15003, employment B23025, disability C18108, health insurance B27010, Gini B19083,
child poverty B17020, SNAP B22010, vehicles B08201, mobility B07201, commute denominator B08012),
or because a cell changed meaning (`B21001_002` is "Male" in 2009, "Veteran" later).
