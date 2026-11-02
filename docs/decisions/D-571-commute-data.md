# D-571 · Commute flows data: LODES od county pairs, its own Data run mode

- **PR:** #471 (part of #469). The UI and the rest of the choices are in D-570 (#470).

**Decided (worker defaults).**
- **Step.** `npm run ingest -- commute` sums every state's LODES 8 od `main` + `aux` files (JT00) from
  block pairs to county pairs and writes `commute/commute.json`; `publish-commute` uploads it. Not a
  registry dataset.
- **Year.** The registry's LODES vintage (`job_density`, 2023); a state without it falls back up to 3
  years (Michigan: 2021). Alaska has no od file since 2016: its counties get no entry.
- **Connecticut.** Any `09…` block, in any state's files, maps to its planning region through
  `ct_xwalk`'s `cty` column.
- **Data run.** `commute` runs alone, with no dataset ids, and touches no database or value files.
- **Merges first.** Split from #470 so the Data run (whose secrets work only on `main`) can publish
  the file before the UI that reads it merges.
