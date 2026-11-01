# D-570 · Commute flows: where a county's workers live and its residents work

- **PR:** #470 (closes #469). Plan and ponytail vote in the issue.

**Decided (lead + ponytail vote).** LODES 8 origin-destination files, all jobs (JT00), `main` + `aux`
per state, summed from block pairs to county pairs by its own ingest step (`commute`, not a registry
dataset), published as one national file `commute/commute.json` (`publish-commute`). County place
pages list the top 10 home counties of its workers and work counties of its residents; the map's county
card has "Show commute flows", which draws straight lines to those counties.

**Decided (worker defaults).**
- **Year.** The registry's LODES vintage (`job_density`, 2023), so the two stay in step. A state
  without that year falls back up to 3 years (Michigan: 2021), as the `lodes` step does, and the page
  cites the county's own state year. Alaska has no od file since 2016: its counties get no entry.
- **Connecticut.** Every state's od blocks use Connecticut's old county codes (aux rows too), so any
  `09…` block is mapped to its planning region through `ct_xwalk`'s `cty` column, once per run.
- **The county itself.** Left out of both top-10 lists; its share is the line above each list
  ("47% live in Hennepin County"), computed before the cut, as a share of that list's total.
- **Lines.** One line per county in either list (up to 20, usually ~12), width by commuters both ways
  over the biggest; drawn in the selection colors (`map.highlight` on `map.highlightHalo`), under the
  selection outline. From and to points are the search index's county points (`geo/search.json`).
- **Loading.** The place page loads the file with the page (~1 MB, ~0.3 MB gzipped). The map loads
  nothing until "Show commute flows" is tapped.
- **Data run.** `commute` is a mode that runs alone with no dataset ids; it touches no database and
  no value files. Its downloads (about 0.8 GB of od files, estimated from five states) are kept on R2 by `publish-raw` like any other.
- **Wording.** "Workers" (jobs located in the county) and "working residents"; the source line says
  counts are jobs, so a person with two jobs counts twice.
