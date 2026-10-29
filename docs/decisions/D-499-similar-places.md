# D-499 · Similar counties: rank closeness across every county measure, each topic counted equally

- **Date:** 2026-10-29
- **Status:** DECIDED (lead, issue #291, under the plan Robbie approved 2026-10-28)
- **PR:** #399

**What.** A county's place profile lists the five counties most like it, each linking to Compare
(opened on a measure they share), with one line saying what "similar" means and, per match, the
measures that made the two alike ("Both high: …. Both low: ….").

**Method, in one sentence:** every county is ranked on every measure, and its matches are the
counties whose ranks come closest overall, each topic counted equally.

- **Measures:** every live registry dataset with county values, except categorical ones and any with
  values for fewer than 90% of counties, plus residents (the population map's published county
  counts, under People, so peers are of similar size). Today that is 126 measures in six topics, race
  and ethnicity included (Robbie, 2026-10-28: every measure counts). Skipped for missingness: the six
  CDC social-needs measures (food and housing insecurity, emotional support, transportation,
  loneliness, utility shutoffs; 71% of counties), overdose deaths, ozone, PM2.5, moved in the past year.
- **Scaling:** percentile ranks (0 lowest, 1 highest, ties share the middle), not z-scores, so skewed
  measures (density, toxic releases, residents) and outliers don't dominate. Ranks make a log of
  population unnecessary: the order is the same.
- **Distance:** weighted root-mean-square rank gap over the measures both counties have. Each topic
  (registry category) counts equally: a measure weighs 1 / the number of measures in its topic, so the
  27 health measures don't outvote the rest (lead, 2026-10-29). A pair needs at least half the
  measures in common. Kentucky, Pennsylvania and Puerto Rico have no CDC PLACES health values (27
  measures), so they are compared on the rest. Same-state matches and Puerto Rico are kept.
- **"Alike on":** up to three measures where both counties sit furthest from the national middle on
  the same side, both in the top or bottom quarter, at most one per topic.

**Where it lives.** `npm run ingest -- similar` (`data/ingest/src/similar.ts`, also in `all` after
`details`) reads the state detail files and `values/population_density/county.counts.json`, and
writes `apps/web/src/generated/similar.json` (510 KB, 131 KB gzipped):
`{ measures: [ids], counties: { geoid: [[peer, distance, high idx[], low idx[]], …] } }`. It is bundled
with the server and rendered there, so the page fetches nothing extra. The shape (top N per county
with a score and the shared measures) is meant to be reusable for peer review (#383).

**Limits.** Correlated measures within a topic still share its weight unevenly (income, poverty and
education overlap). The GitHub Data run can't commit, so it doesn't refresh this git file: matches
only update when someone re-runs `similar` after `details` and commits.
