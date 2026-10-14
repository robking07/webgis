# D-311 · Six dataset categories with subcategories; Change dataset is a real button

- **Date:** 2026-10-14
- **Status:** ACCEPTED (categories decided by Robbie, 2026-10-13; the rest are worker defaults for his review)
- **PR:** #211 (issue #199)
- **Changes:** the 15 flat categories in `data/registry/schema.ts`; D-25 (the dataset card's actions)

## Decided by Robbie (2026-10-13)

Six top-level categories. Subcategories show as headings in the list; the filter chips stay top-level.
Education stays a subcategory until it has enough maps to stand alone.

| Category | Subcategories |
| --- | --- |
| People | Population and age · Race and ethnicity · Education · Immigration and language |
| Economy | Income and poverty · Jobs · Internet access |
| Housing | Costs · Homes |
| Health | Conditions · Behaviors · Care and coverage · Disability · Daily needs · Food access · Environmental justice |
| Transportation | Commuting · Roads and vehicles · Traffic safety |
| Environment and climate | Climate · Natural hazards · Air quality · Energy burden · Social vulnerability |

The list and its order live in `data/registry/categories.ts`. Each dataset's YAML has `category` and
`subcategory`; `npm run registry:validate` fails if a subcategory isn't one of its category's.

## Defaulted (worker)

- **Placements the list didn't name:** moved in the past year, seniors living alone, single-parent
  families and veterans → People / Population and age; all teeth lost, fair or poor health, frequent
  mental and physical distress, obesity → Health / Conditions; dentist visit → Health / Care and
  coverage; yearly home energy bill → Environment and climate / Energy burden; CEJST maps → Health /
  Environmental justice (as the list says, though Energy burden used to share that category).
- **Order:** chips and groups follow Robbie's order everywhere (map menus, dataset browser, place
  data list); maps within a subcategory keep registry order.
- **Dataset browser ("Change dataset" panel):** with "All", each category's name heads its first
  subcategory; the per-row category label is gone (the headings carry it).
- **/data and dataset pages** show "Category › Subcategory".
- **Compare page** topic groups use the new categories in category order, the metric's own first.
- **Odd Pairings** keep the "same category: expected, not weird" rule at the category level. Wider
  categories flag more pairs (climate × heat-wave losses, income × broadband) the next time insights
  are rebuilt.
- **relations.yaml** `group` stays equal to the top-level category.
- **Change dataset:** the accent-filled pill (`Button size="sm"`, h-7 like Map options, D-135) beside
  Map options under the title, on laptops and phones. Phones open the dataset sheet; larger screens
  open the dataset browser. The old top-right text link is gone.
- **"Only after a reload":** not a render bug. The card falls away on the first gesture on the map
  (D-25 immersion): any wheel or trackpad scroll over the map, or a click that drifts 3 px into a drag.
  After that only the menu button, the top edge or Esc brings it back, and a reload resets it. The
  immersed heading keeps the category and title drop-downs but has no Change dataset button. Left as
  is for Robbie to decide.

## Amendment (Robbie, 2026-10-14)

1. **Hidden card:** on laptops and larger screens, once the card hides, a small "Change dataset" button
   (the same pill, `ChangeDatasetButton` in `DatasetCard.tsx`) stays at the top beside Map options and
   opens the same dataset browser. Checked by the e2e test "laptop hidden card".
2. **Phones** keep the filled Change dataset button on the card. When the card hides, the title in
   the heading still opens the dataset sheet.

The other defaults above stand: the filled accent pill, "Category › Subcategory" labels, registry
order within a subcategory, and the Odd Pairings rule at the category level.

## Amendment (Robbie, 2026-10-14, #225)

Robbie, 2026-10-14: button removed; the title drop-down is the one menu, #225. The Change dataset
button (card, full-screen heading, phones) and the dataset browser side panel are gone; the title and
its caret open the dataset menu. See D-326.
