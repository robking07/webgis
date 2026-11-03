# D-610 · Old years: general notes and a U.S. row for every year

- **Date:** 2026-11-03
- **Status:** DEFAULTED (worker, lead to confirm)
- **PR:** #510

The registry has one coverage note per map, not one per year, so notes on long-history maps now
say only things true in every year. Year-specific facts carry their period ("El Paso County,
Texas, in 2023–2025") or a range ("about 640 to 730 counties, depending on the period").

Traffic deaths, toxic releases and jobs now write `values/<id>/<year>/us.json` for every older year,
using the same rule as their default year: traffic deaths = deaths ÷ residents summed over the states
(skipped if any state has no rate); toxic releases = pounds ÷ land area of the states; jobs = jobs ÷
land area of the states that have data that year (as the 2023 figure already leaves out Alaska).
Default taken for jobs: a U.S. figure in every year, even 2002 with six states missing. Alternative:
only years with at most one state missing.

Toxic releases 1987 is real, not an ingest error: EPA's 1987 Basic Data File gives Harris County,
Texas, 411 million lb on site, and 10.6 of the year's 17.5 billion lb nationally are sodium sulfate
(solution), deleted from the TRI list after 1987 (EPA's TRI chemical list changes). The note says so.
