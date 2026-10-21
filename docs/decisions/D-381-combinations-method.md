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
   [--dry-run]`) writes `apps/web/src/generated/combinations.json`. `insights.ts` gained `export`s
   and, per the second amendment, a DB-free `reflag` step that flagged 9 pairs; its caption prompt,
   captions, numbers and pair fingerprints are untouched.
3. **Holdout and stability.** States split in two, alternating within each Census division. As
   amended (third amendment): a set discovered on one half is confirmed only on the other; being
   found from both halves (`stable`) ranks it higher but no longer gates it. This replaces the
   proposal's 100 bootstraps (`shortcut:` comment marks the bootstrap / spatial-permutation upgrade).
4. **Confirmation**, on the held-out half: beats its best single member by ≥ the gain threshold
   (0.02 within-state R²); every member earns its place (dropping it costs ≥ half the gain
   threshold) and keeps its discovery sign; partial-F test of the gain on a Clifford effective n
   (Moran correlograms over 200 equal-count distance classes between 2024 Gazetteer county internal
   points), then Benjamini–Yekutieli at 5% across every set confirmed; the held-out fit still beats
   the best member in ≥ 3 of the 4 Census regions.
5. **Guardrails.** Focus–companion pairs pass today's pair screen; companion pairs pass every pair
   rule except "weak" and "same category"; companions |ρ| ≤ 0.7, ≤ 2 per category, ≤ 1 CDC PLACES
   estimate; ≥ 1,000 complete counties.
6. **Dedupe.** One combination per focus (the largest that passed), then sets sharing ≥ 60% of the
   larger set's members are merged, keeping the higher held-out gain.
7. **Flags.** `urbanRural`: the gain drops below 0.01 once population density joins the baseline
   (or the focus is population density). `sensitive`: any member is in People › Race and ethnicity,
   People › Immigration and language or Health › Disability, or has "disability" or "minority" in
   its title. Direct members only; `modelInputs` are not followed (first amendment). Per the lead's
   gate, sensitive combinations wait for Robbie's review.
8. **Captions** are a template, no model calls: "Counties with higher A, higher B and lower C tend to
   have lower Y. Together they line up with Y [much] more closely than any one alone." ("much" only
   when the held-out gain is ≥ 0.10; third amendment.) Each
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
- 2026-10-20 (lead): the fuller `modelInputs` made 9 published pairs by-construction matches
  (Hispanic, Black and Asian shares × SVI minority; poverty and rent burden × SVI income and jobs;
  diploma, disability, internet and broadband × FEMA social vulnerability), so the data-page
  "Built using …" line was untrue for them. Rather than a full `insights` run (database, new
  captions, voided fingerprints), `npm run ingest -- insights --reflag` re-applies only the
  non-numeric pair rules (by construction, shared variables, shared denominators) to the committed
  `insights.json` with the current registry. Those 9 moved to flagged (1,768 → 1,759 published);
  every other field and pair is byte-identical. The database's `insights` table catches up at the
  next full run. `combinations.json` was unchanged (the leak rule had already excluded those pairs).
- 2026-10-20 (lead, after an independent ponytail-review voted HOLD):
  1. **Effective n.** 10 distance classes put 0–450 km in the nearest class and washed out
     neighbour similarity (reviewer: nEff 438 vs 101 on a 100 km smoothed field). Now 200
     equal-count classes (binary search over the cuts); a smoothed-field test expects nEff < 8% of n.
  2. **True holdout.** Discovery (candidate ranking by |within-state ρ| and greedy fitting) uses only
     its half; confirmation (gain, signs, F and BY p-values, regions) uses only the other half.
     Found-in-both is a `stable` field and a ranking signal; the union of both directions is then
     deduped as before. The pair screen that admits candidates is still today's all-county screen
     (`shortcut:` comment).
  3. **Earns its place.** Dropping any member must cost ≥ half the gain threshold on the held-out half.
  4. **Caption strength.** "much more closely" only when the held-out gain is ≥ 0.10, else "more closely".
  Result at gain 0.02: 367 sets tested (each discovered set, each direction), 294 passed, 72 after
  dedupe (26 trios, 32 fours, 14 fives); 7 urban–rural, 35 sensitive, 27 stable; held-out nEff 220–1,332.
