---
name: dataset-display-review
description: Review how webgis datasets read to a regular person and fix what doesn't — cryptic codes or IDs (route LRS ids, FIPS, program acronyms), raw units, missing explainers, categorical fields that should be filters ("facets"), and opportunities to let users dig deeper (levels, comparisons). Use after adding or changing any dataset, when Robbie flags something confusing on the map, or as a periodic sweep ("display cleanup", "explainers", "make this readable").
---

# Dataset display review

**Principle:** the map page is authoritative and clean (D-25). Every number, label and filter must make sense to a non-specialist, and extra options appear only as the user digs in (progressive disclosure, D-26). Explanations live in one place, the glossary, and are reused everywhere.

## Where things live

| What | File | Shown on |
|---|---|---|
| Plain-language explainers | `data/registry/glossary.yaml` (`short` = one sentence, `long` = a paragraph) | dataset card ⓘ (short), `/data/<id>` "Explainers" (long), facet ⓘ |
| Which explainers a dataset uses | `terms: [...]` in the dataset YAML (validated: every id must exist) | same |
| Filterable categories on feature layers | `facets:` in the dataset YAML (`field`, `label`, `explainer`, `term`, `values[{value,label,description}]`) | map "Display options", `/data/<id>` "Filters on the map", popup value labels |
| Readable derived fields (e.g. route labels) | `measure.select` SQL template in the dataset YAML (`{layer}`, `{state}`) | popups, titles |
| Popup field labels and units | `measure.fields` (`label` or `{label, unit}`) | popups |
| Unit words | `UNIT_LABEL` in `packages/design/src/format.ts` | profile page |
| Vintage wording | `vintage:` in the dataset YAML: plain years ("2023 data", "2020–2024 average"), never program acronyms | dataset list, card, legend |

## The pass, for each dataset (or the one that changed)

1. **Look at it like a visitor**, in a browser at desktop and phone width (headless recipe in `build-tiles` and the DECISIONS log): dataset list line, dataset card, legend, hover tooltip, click details, table, `/data/<id>`.
2. **Hunt for codes.** Any value a person would have to look up is a bug: LRS route ids, FIPS/GEOIDs, numeric category codes (`f_system = 3`), program acronyms (BRFSS, HPMS, NBI, FARS) in titles or vintages, ALL-CAPS source strings, raw unit codes (`deg_f`). Fix at the source: derive a readable field in `select`, map codes through a facet's `values`, rewrite the vintage, add a unit word.
3. **Explain the jargon.** Every dataset gets `terms` covering its method (estimate type, rate basis, classification). Missing a term? Write it in `glossary.yaml`: `short` in ≤ 25 words a 9th-grader can follow; `long` ≤ 90 words, saying why it matters for reading the map; link the authoritative source.
4. **Find facets.** Any categorical field on a feature layer that a person might want to isolate (road type, functional class, bridge condition, owner, crash type, transit mode) becomes a facet with an explainer and a description for every value. Choropleths have no facets; instead note **dataset families** (siblings someone would switch between, e.g. commute modes) for the family switcher.
5. **Dig-deeper paths.** Record what the next level of detail would be: a finer geography (block group/block), a natural comparison dataset (bivariate), a point/line layer underneath a rate (crash points under the fatality rate). Add them to `docs/display-audit.md` "Opportunities" if not built.
6. **Validate and record.** `npm run registry:validate`, `npm run build` (design gate), screenshots of the changed views, then update `docs/display-audit.md` (the per-dataset table) and log a DECISIONS entry for anything non-obvious.

## Writing rules for explainers

- Plain words first, the technical name second ("How many vehicles pass a point on an average day (AADT)").
- Say what it means **for reading the map**, not how the agency computes it.
- No hedging walls: one caveat, the one that matters most.
- Never editorialize on the map page; voice belongs in Insights.
