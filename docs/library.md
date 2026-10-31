# The Library

Library maps are made by a recipe, not by hand (#372, D-521). Each one passed automatic checks and
says **Added automatically** wherever it is shown: on the map card, in search results and the
dataset menu, and on its `/data/<id>` page. They are not listed in the dataset menus' category
lists. Visitors find them through search and the **More in the Library (n)** line at the end of
each subcategory. The `/data` page lists them as their own source group. Library maps are not paired
in Combinations or used by similar places, compare places, place pages or the "all datasets here" lists. Each of those
gets the map when it is promoted to Featured.

## How a Library map is made

1. **Recipe:** `data/registry/library/acs-profile.yaml`, one line per map: id, plain title, topic
   (category/subcategory), universe, the ACS cells (`num`, plus `den` for a detailed table),
   a one-sentence description and search tags. Data Profile cells (`DP02`–`DP05`, `P` = the
   Census Bureau's own percent) need no denominator. Wording rule: no Census codes in titles, and
   no topics on the sensitive list (race and ethnicity, ancestry, citizenship and foreign birth,
   language, disability, health insurance, poverty) until Robbie has reviewed the wording.
2. **Checks:** `npm run ingest -- library` (needs `CENSUS_API_KEY`) fetches state, county and
   tract values for every recipe map and keeps a map only if, at every level, at least 90% of
   areas have a value, at least 90% of those values have a published margin of error (so
   reliability hatching works as for every ACS map, D-222), and every value is within 0–100. It
   If more than half of a map's graded tract values are unreliable, the map ships at state and
   county only, with a note in the checks file (D-521). It
   writes `data/registry/datasets/<id>.yaml` (with `library: true`) for each map that passes, removes the file of
   each map that fails, and records the results, including the share of unreliable estimates, in
   `data/registry/library/acs-profile.checks.json`. Nobody fixes a failing map by hand. The map is
   left out.
3. **Gate in CI:** `npm run registry:validate` fails for any `library: true` entry without a
   passing result in the checks file, so an unchecked map can't merge.
   (`npm run ingest -- library --offline` writes every recipe entry without checks, for drafting.)
4. **Load and publish:** the same as any ACS map. They are `acs5` entries, so `ingest acs <ids>`
   loads them (`data/ingest/src/acs.ts` sends `DP` cells to the `acs5/profile` endpoint).

## Promote a Library map to Featured (checklist)

Keep the id, so links keep working.

1. Remove the map's line from `data/registry/library/acs-profile.yaml` (otherwise the next
   `ingest library` run overwrites the entry) and drop it from `acs-profile.checks.json`.
2. Edit `data/registry/datasets/<id>.yaml`: delete the generated header comment and
   `library: true`. Set `source.name` to the Featured ACS name
   (`U.S. Census Bureau, American Community Survey 5-Year Estimates`) and keep `citation` and `url`.
3. Do the hand work a Featured map gets: a `phrase` for Combinations captions, a description written
   for a cold visitor, a ramp checked against its subcategory, `higherIsBetter` if it applies, and a
   `timeline` if earlier periods use the same cells (Data Profile numbers change between years, so
   check each one).
4. Add it to `data/registry/relations.yaml` under `maps:` (`group` = category). A detailed-table map
   starts publishing counts once promoted, so give it `counts: { of, per }` and reload it with
   `ingest acs <id>`. A Data
   Profile percent has no `counts`.
5. Run `npm run registry:validate`, `npm test` and `npm run build`. Run the `dataset-display-review`
   skill on it.
6. After merging, run `npm run ingest -- insights` (and `combinations`) so it gets pairs. Its
   values are already on R2.
