# D-586 · Climate maps reach back to 1895

- **Date:** 2026-11-01
- **Status:** DEFAULTED (lead)
- **PR:** #486 (part of #479)

The 7 NOAA nClimDiv county maps (average temperature, July high and low, January low, precipitation,
heating and cooling degree days) had single-year stops 1991–2025. nClimDiv county data starts in 1895,
so the timeline now does too.

**Stop shape chosen:** 10-year averages before 1991, single years from 1991 on, and the 1991–2020
normal stays the headline. The decades end in 1990, 1980, ... 1900 ("1981–1990 average", ...), so they
line up against the normals period with no gap. The oldest one is 1895–1900 (six years, labeled that
way). Each average needs 80% of its years per county, the same rule as the normal. Ids are the last
year ("1990"), so they are dated stops and can start a change map. The legend note says it is an
average and that early decades have far fewer stations.

Why: single years are weather, not climate, and 130 notches on the slider is a lot to scrub.
Decades are the usual unit short of a 30-year normal, and keep 10 early stops. Recent single years
stay because people look for "last summer".

**Alternative not taken:** single years all the way back (one line per registry entry, no code), 131
stops. It is the smallest change but shows noise as if it were trend. Others: 30-year normals only
(1895–1924, ...: only 4 early stops, too coarse); rolling averages (overlap, many files).

**Code:** `timelineStops` (`data/registry/timeline.ts`) gives climdiv a `span` on average stops;
`ingestClimdivTimeline` averages over the span. No new ingest step; the run is `timeline` for these ids.
`periods.json` is not changed here (separate PR after the run, runbook section 8).

**Caveat (coverage note):** early decades are reconstructed from far fewer weather stations
(nClimGrid method, Vose et al. 2014), so early county-to-county differences are less certain.
