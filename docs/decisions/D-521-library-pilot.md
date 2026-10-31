# D-521 · The Library pilot: Library maps from one ACS recipe

- **Date:** 2026-10-30
- **Status:** DEFAULTED (worker), for the lead. The product calls (no menus, label, Data Profiles,
  no Combinations, the planner topics and the sensitive-topic exclusions) came from the brief and the plan.
- **PR:** #421 (issue #372). How-to and promotion checklist: `docs/library.md`.

## What was built

- **A Library map is an ordinary registry entry with `library: true`**, in `data/registry/datasets/`.
  It uses the same `acs5` measure, the same ingest, files and reliability grading. The schema now accepts Data
  Profile cells (`DP04_0068P`), and `acs.ts` fetches them from `acs5/profile`. A percent cell is read
  with its published margin (no denominator). A sum of cells uses the usual root-sum-of-squares
  margin. Promotion means editing the same file and keeping the id. No separate Library folder or index,
  because 103 maps don't need one (sizes below).
- **One recipe, one step:** `data/registry/library/acs-profile.yaml` lists the maps.
  `npm run ingest -- library` runs the checks and writes or removes the entries, then writes
  `acs-profile.checks.json`. `registry:validate`, which CI runs, fails on any Library entry without a
  passing check.
- **The checks are the ones the brief listed, at state, county and tract:** values within 0–100,
  coverage (90% of areas or more), and margins present (90% of values or more), so D-222 hatching works.
  Reliability itself is not a gate. The share of unreliable tract estimates is recorded per map
  for the lead and Robbie. Thresholds are `MIN_COVERAGE` and `MIN_MOE` in `library.ts`.
- **Where Library maps show:** search (Featured first), the **More in the Library (n)** line under
  each subcategory in the dataset menu (folded, open when the map on screen is one of them), the
  `/data` page (their own source group, "ACS 5-year estimates (added automatically)") and
  `/data/<id>` pages. The label "Added automatically" appears on the map card's meta line, in menu
  and search rows, and on the dataset page.
- **Where they don't:** the menus' category lists, Combinations and insights, similar places, compare
  places, place pages and the "all datasets here" lists (`DATASETS` in the web registry is now
  Featured only; `ALL_DATASETS` holds everything). Library maps have no `relations.yaml` entry until promotion.
- **Mostly Data Profiles, plus 10 detailed-table maps** where a planner question has no profile cell
  (renters 65 and older, veterans by age, smartphone-only and cellular-only households, short
  commutes, out-of-state work). The brief named Data Profiles as the source. The recipe takes either kind,
  and the example search ("renters over 65") has no profile cell.

## Scale (measured)

- `apps/web/src/generated/registry.json`: 282 KB → 424 KB raw, 34 KB → 43 KB gzipped (+8.5 KB) for
  103 maps. It is bundled into the map page. The research's ~1,000-map break point holds, so no slim index yet.
- Not measured here (no data loaded): `details/<state>.json` grows by about 100 maps' state and
  county values (estimate +60–70%, Texas ~1.4 → ~2.3 MB raw). Supabase gains about 0.6 MB per map,
  about 60 MB, which is still far from the ~650-map break point.

## Known limits (`shortcut:` candidates)

- A subcategory with Library maps but no Featured map shows no "More in the Library" line. None
  exist in the pilot.
- The check run is not cached: about 380 Census API calls per run.
