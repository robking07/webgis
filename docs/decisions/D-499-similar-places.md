# D-499 · Similar counties: rank closeness across every county measure

- **Date:** 2026-10-29
- **Status:** DEFAULTED (worker, issue #291, under the plan Robbie approved 2026-10-28; the lead decides)
- **PR:** #399

**What.** A county's place profile lists the five counties most like it, each linking to Compare
(opened on a measure they share), with one line saying what "similar" means and, per match, the
measures that made the two alike ("Both high: …. Both low: ….").

**Method, in one sentence:** every county is ranked on every measure, and its matches are the
counties whose ranks come closest overall.

- **Measures:** every live registry dataset with county values, except categorical ones and any with
  values for fewer than 90% of counties. Today that is 125 measures, race and ethnicity included
  (Robbie, 2026-10-28: every measure counts). Skipped for missingness: the six CDC social-needs
  measures (food and housing insecurity, emotional support, transportation, loneliness, utility
  shutoffs; 71% of counties), overdose deaths, ozone, PM2.5, moved in the past year.
- **Scaling:** percentile ranks (0 lowest, 1 highest, ties share the middle), not z-scores, so skewed
  measures (density, toxic releases) and outliers don't dominate.
- **Distance:** root-mean-square rank gap over the measures both counties have; a pair needs at least
  half of them in common. Kentucky, Pennsylvania and Puerto Rico have no CDC PLACES health values
  (27 measures), so they are compared on the rest. Every measure counts equally; health has the most
  measures (27 of 125) and so the most weight. Same-state matches are kept.
- **"Alike on":** up to three measures where both counties sit furthest from the national middle on
  the same side, both in the top or bottom quarter, at most one per registry category so the health
  measures don't crowd out the rest.

**Where it lives.** `npm run ingest -- similar` (`data/ingest/src/similar.ts`, also in `all` after
`details`) reads the state detail files and writes `apps/web/src/generated/similar.json` (510 KB,
127 KB gzipped): `{ measures: [ids], counties: { geoid: [[peer, distance, high idx[], low idx[]], …] } }`.
It is bundled with the server and rendered there, so the page fetches nothing extra. The shape (top
N per county with a score and the shared measures) is meant to be reusable for peer review (#383).

**Limits.** Correlated measures (income, poverty, education; many health ones) count several times.
No total population, since the details files hold only rates (population density stands in). Matches
only refresh when someone re-runs `similar` after `details`.
