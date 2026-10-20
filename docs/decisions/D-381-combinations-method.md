# D-381 · Combinations: how sets of 3 to 5 datasets are found

- **Date:** 2026-10-20
- **Status:** DECIDED (lead + ponytail vote, issue #280); phase 1 (analysis) in this PR, UI later
- **PR:** #281

Robbie asked to rename Odd Pairings to Combinations and add sets of 3, 4 and 5 datasets, judged
by what the research says about significance across many disparate datasets. The method is the
proposal in `drafts/proposals/combinations-method.md` (sources: Chung et al. 2024, Hu et al. 2021,
Markello & Misic 2021, Clifford, Richardson & Hémon 1989, Roberts et al. 2017, Benjamini &
Yekutieli 2001), with the amendments the lead and ponytail both agreed:

1. **Outcome-led sets.** One focus dataset plus 2–4 companions (sets of 3, 4 and 5), built by greedy
   forward selection from the focus's passing pairs (top 30 by |within-state ρ|) on rank-transformed,
   state-demeaned values. A companion joins only if it raises R² by at least the gain threshold.
2. **Separate script and output.** `data/ingest/src/combinations.ts` (`npm run ingest -- combinations
   [--dry-run]`) writes `apps/web/src/generated/combinations.json`. `insights.ts` only gained
   `export`s; `insights.json`, its caption prompt and pair fingerprints are untouched.
3. **Stability = found in both split directions.** States split in two, alternating within each
   Census division. A set counts only if discovery on half A and discovery on half B both find it,
   and it confirms on the half it never saw, both ways. This replaces the proposal's 100 bootstraps
   (`shortcut:` comment marks the bootstrap / spatial-permutation upgrade).
4. **Confirmation**, on the held-out half: beats its best single member by ≥ the gain threshold
   (0.02 within-state R²); every member earns its place (dropping it lowers R²) and keeps its
   discovery sign; partial-F test of the gain on a Clifford effective n (Moran correlograms over 10
   equal-count distance classes between 2024 Gazetteer county internal points), then
   Benjamini–Yekutieli at 5% across every set that reached confirmation; the full-data weights still
   beat the best member in ≥ 3 of the 4 Census regions.
5. **Guardrails.** Focus–companion pairs pass today's pair screen; companion pairs pass every pair
   rule except "weak" and "same category"; companions |ρ| ≤ 0.7, ≤ 2 per category, ≤ 1 CDC PLACES
   estimate; ≥ 1,000 complete counties.
6. **Dedupe.** One combination per focus (the largest that passed), then sets sharing ≥ 60% of the
   larger set's members are merged, keeping the higher held-out gain.
7. **Flags.** `urbanRural`: the gain drops below 0.01 once population density joins the baseline
   (or the focus is population density). `sensitive`: any member is in People › Race and ethnicity,
   People › Immigration and language or Health › Disability, has "disability" or "minority" in its
   title, or is modelled from such a dataset (`modelInputs`, e.g. the CDC SVI and FEMA social
   vulnerability indexes). Per the lead's gate, sensitive combinations wait for Robbie's review.
8. **Captions** are a template, no model calls: "Counties with higher A, higher B and lower C tend to
   have lower Y. Together they line up with Y much more closely than any one alone." Each
   combination has a `fingerprint` (members, numbers, caption) so D-116's re-review rule applies.

Deviations, small: ranks stand in for the proposal's rank-normal transform (same as the pair
screen's Spearman); values come from the published county value files rather than the database;
Puerto Rico (no Census region) and counties without a 2024 centroid sit out. Captions say
"higher/lower" rather than "more/fewer" because registry `phrase`s are written to follow those words.

First run at gain 0.02 (before the amendments): 68 sets tested, 63 passed, 35 after dedupe (19 trios, 13 fours, 3 fives);
6 urban–rural, 20 sensitive. Thresholds are judgment calls, set to be conservative.

## Amendments

- 2026-10-20 (lead, after the first dry run):
  1. **Ingredient leak.** A companion may not be built from the focus or another member, or they
     from it, following `modelInputs` transitively (a seen-set guards against cycles). The
     registry's `modelInputs` now list the inputs from the CDC/ATSDR SVI 2022 documentation and the
     Census Community Resilience Estimates that FEMA NRI v1.20 social vulnerability uses, mapped to
     Mapwich ids: `svi_socioeconomic` adds poverty and housing-cost burden (renters and owners);
     `svi_minority` adds every race and ethnicity share; `nri_social_vulnerability` adds no diploma,
     crowding, disability and broadband/internet. (SVI's 10+ unit housing, group quarters and CRE's
     caregiver and employment factors have no Mapwich dataset.)
  2. **Composites.** At most one composite index per combination, focus included: CDC SVI (overall
     and themes), CEJST, FEMA NRI risk score, social vulnerability, community resilience and total
     expected loss.
  3. **Sensitive = direct members only.** Subcategory Race and ethnicity, Immigration and language
     or Disability, or "disability"/"minority" in the title. `modelInputs` are not followed.
  4. **Caption phrases.** 26 registry entries gained a `phrase` written to follow "higher/lower".
     Pair captions are written at ingest time, so they change only when `insights` is re-run.
  Result at gain 0.02: 60 tested, 55 passed, 34 after dedupe (21 trios, 9 fours, 4 fives);
  6 urban–rural, 13 sensitive.
