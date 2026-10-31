---
title: "The yearly numbers came out fine. Small places are still waiting."
dek: "Since June, the Census Bureau may no longer add statistical noise to protect privacy. Its yearly survey numbers for larger places came out October 29 with slightly more tables than the old rules allowed; the five-year file that small counties and neighborhoods rely on has no date and no announced method."
topic: Data policy
date: 2026-10-28
datasets: [pct_work_from_home]
caption: "Share of workers who usually work from home, by county (ACS 2020–2024 5-year estimates). Every one of these 3,144 county numbers comes from the 5-year survey release, the one that now has no date."
method: |
  Every Mapwich number was computed from the U.S. Census Bureau's American Community Survey 2020–2024 5-year estimates, as Mapwich publishes them (estimates, margins of error and population counts), with a script kept beside this piece (`numbers.mjs`). The 50 states and DC; Puerto Rico is left out. County size is the ACS 2020–2024 total population (table B01001). The Census Bureau decides which areas get 1-year estimates from its own population estimates, so the county counts against the 65,000 and 20,000 lines are close, not exact. Reliability grades follow Mapwich's rule: coefficient of variation (CV) = (margin ÷ 1.645) ÷ estimate; under 15% reliable, 15–30% use with caution, over 30% unreliable; a zero is graded unreliable when its margin is over 5 points. Outside sources are linked in the text. This piece was drafted by Claude, an AI model, for Robbie King, and reviewed by Robbie King.
author: "Drafted by Claude for Robbie King"
draft: false
---

**Guess first.** Three questions before you read. The answers are in the piece, from Mapwich's own data.

1. The Census Bureau's standard yearly (1-year) survey estimates cover only places of 65,000 people or more. About what share of the 3,144 U.S. counties fall below that line? *A quarter, half, or three-quarters?*
2. Mapwich maps the share of workers who work from home for 83,459 census tracts. In how many is the margin of error bigger than the estimate itself?
3. In counties of under 5,000 people, what share of work-from-home estimates does Mapwich grade *unreliable*, its lowest grade? And in counties of 65,000 or more?

## What changed

On June 4, 2026, the Commerce Department, which runs the Census Bureau, put an order into effect called DAO 216-26, *Disclosure Avoidance for Statistical Products*. It says noise infusion ["shall not be used for any statistical product"](https://datafoundation.org/news/data-policy/886/886-DAO-216-26-Fact-Sheet) of the Census Bureau or the Bureau of Economic Analysis.

```callout
text: |
  Noise infusion means making small, deliberate changes to published numbers or to the records behind them, so that no one can pick a real person out of a table. NPR called it [one of the main privacy techniques](https://www.wunc.org/2026-06-12/a-trump-push-to-cut-statistical-noise-could-mean-less-data-from-the-census-bureau) the Bureau "has used for decades." The 2020 Census used a version called [differential privacy](https://datafoundation.org/news/data-policy/886/886-DAO-216-26-Fact-Sheet). Census Bureau leaders said in August that swapping, an older method that trades some households' details between areas, [counts as noise under the order](https://datafoundation.org/news/blogs/893/893-Accuracy-Access-and-Confidentiality-Census-Leadership-Addresses-the-Disclosure-Avoidance-Order) too.
```

The Bureau says its reading of the confidentiality law, Title 13, [hasn't changed](https://thecensusproject.org/2026/08/13/standard-deviations-how-will-methodology-restrictions-affect-demographic-and-economic-data/). What changed is the set of tools it may use to keep answers confidential. The order [allows two methods](https://www.census.gov/newsroom/blogs/director/2026/08/understanding-the-new-disclosure-avoidance-policy.html): **coarsening**, publishing less detail [through rounding, grouping or ranges](https://datafoundation.org/news/data-policy/886/886-DAO-216-26-Fact-Sheet), and **suppression**, withholding a number, "only as a last resort."

A Commerce spokesperson told NPR the order favors coarsening to ["maintain public confidence in our data"](https://www.wunc.org/2026-06-12/a-trump-push-to-cut-statistical-noise-could-mean-less-data-from-the-census-bureau) while protecting respondents' privacy.

## A late release, and one with no date

The American Community Survey (ACS) is the Census Bureau's ongoing survey of how Americans live: income, commutes, rent, health insurance, language and more. Its yearly 1-year estimates [normally come out in September](https://www.osbm.nc.gov/blog/2026/09/01/federal-policy-will-limit-public-data-available-nc-communities). This year, on August 4, the Bureau said the release date was ["being determined"](https://www.census.gov/newsroom/press-releases/2026/iphi-acs-media-advisory.html) while it sought "DAO-compliant solutions." On October 13 it [set October 29](https://www.census.gov/newsroom/press-releases/2026/dates-announced-for-2025-acs-1-year-estimates.html), and the 2025 1-year estimates [came out that day](https://www.census.gov/programs-surveys/acs/news/updates.html).

For those yearly tables, the Bureau [stopped swapping](https://www.census.gov/programs-surveys/acs/technical-documentation/user-notes/2026-06.html). It said the population floors, 65,000 people (20,000 for the supplemental tables), already give them strong protection. It also dropped three older release rules that held some tables back, so the release had nearly 38,000 more detailed tables than the old rules would have allowed, a 0.4% increase. Swapping, the same note says, was designed to protect small areas such as tracts and block groups in the 5-year products. The note doesn't say what the 5-year file will use instead.

The 5-year estimates, for 2021–2025, [usually follow in December](https://www.osbm.nc.gov/blog/2026/09/01/federal-policy-will-limit-public-data-available-nc-communities). They have no date: the Bureau's schedule says only that ["release dates for the remaining 2025 ACS products will be forthcoming."](https://www.census.gov/programs-surveys/acs/news/data-releases/2025/release-schedule.html) The new methods will be [phased into the 5-year files](https://thecensusproject.org/2026/08/13/standard-deviations-how-will-methodology-restrictions-affect-demographic-and-economic-data/), with the Bureau aiming for a [full transition by 2029](https://www.census.gov/newsroom/blogs/director/2026/08/understanding-the-new-disclosure-avoidance-policy.html).

That date matters most for small places, because the 5-year file is often all they get. **Answer 1: three-quarters.** By Mapwich's population figures, 2,308 of the 3,144 counties, 73%, have fewer than 65,000 people, so they get no standard 1-year estimates at all. Of those, 1,323 counties, 42% of all counties, are under 20,000 people, too small even for the Bureau's [shorter 1-year supplemental tables](https://www.census.gov/newsroom/press-releases/2026/dates-announced-for-2025-acs-1-year-estimates.html). About 12.7 million people live in them. Below the county, every census tract and block group number comes only from the 5-year file.

## Already at the edge

Mapwich shows the margin of error that comes with every ACS number. That margin measures sampling error: the survey asks a [sample of homes](https://www.census.gov/acs/www/methodology/sample-size-and-data-quality/sample-size/), not everyone, so luck plays a part in who answered. It doesn't include the privacy noise, which was a separate, deliberate change. (Our [explainer](/specials/acs-explainer) covers how to read the margins.)

The margins show how thin neighborhood numbers already are. **Answer 2: 8,659 tracts, 10%.** In that many of 83,459 tracts, the work-from-home margin is bigger than the estimate. Mapwich grades 41,072 of them, 49%, unreliable: hatched on the map when you turn on **Hatch unreliable estimates**.

| Tract estimates, 50 states and DC | Tracts | Reliable | Unreliable | Margin bigger than the estimate |
|---|---|---|---|---|
| Workers who work from home | 83,459 | 8% | 49% | 10% |
| Households with limited English | 83,359 | 0.4% | 65% | 71% |
| Households with no vehicle | 83,359 | 3% | 79% | 33% |
| No health insurance | 83,466 | 3% | 61% | 11% |
| Population below poverty | 83,418 | 3% | 60% | 5% |
| Households that rent | 83,359 | 36% | 21% | 2% |
| People with a disability | 83,466 | 20% | 8% | 1% |

*ACS 2020–2024 5-year estimates as Mapwich publishes them. Grades use Mapwich's rule (see "How this was made"). The rest of each row is "use with caution" or a zero with a small margin.*

Planners use these numbers anyway, and they're right to. A wide range still says something, and the ACS is often the only neighborhood source there is. The range is the honest part.

```map
datasets: [pct_work_from_home]
at: [-96.05, 41.27, 10]
level: tract
caption: "Omaha and Douglas County, Nebraska, by tract. In Douglas County, 16.1% of workers work from home, give or take 0.6 point. Across its 163 tracts the typical margin is 5.7 points, and Mapwich grades 58 tract estimates unreliable."
```

## Small places first

The yearly tables cover only places of 20,000 people or more. For the 5-year file, which numbers get coarsened or withheld isn't public yet. The Bureau has said these methods can cut detail for small areas and small groups, ["the places where confidentiality risks are highest."](https://www.census.gov/newsroom/blogs/director/2026/08/understanding-the-new-disclosure-avoidance-policy.html) A Georgetown demographer told NPR, ["There are some counties that are only a couple hundred people."](https://www.wunc.org/2026-06-12/a-trump-push-to-cut-statistical-noise-could-mean-less-data-from-the-census-bureau) North Carolina's state data center warned that rural and tribal communities [are hit hardest](https://www.osbm.nc.gov/blog/2026/09/01/federal-policy-will-limit-public-data-available-nc-communities) when data are pooled into bigger areas.

Mapwich's margins show the same places are already the least certain. **Answer 3: 42%, against none of the 836 counties of 65,000 or more.**

| County population | Counties | Work from home: reliable | Work from home: unreliable | Typical margin |
|---|---|---|---|---|
| Under 5,000 | 319 | 4% | 42% | ±4.1 points |
| 5,000 to 19,999 | 1,004 | 19% | 19% | ±2.4 points |
| 20,000 to 64,999 | 985 | 63% | 2% | ±1.7 points |
| 65,000 to 249,999 | 549 | 99% | 0% | ±1.1 points |
| 250,000 or more | 287 | 100% | 0% | ±0.7 points |

*All 3,144 counties have a work-from-home estimate, ACS 2020–2024. "Typical" is the median.*

```map
datasets: [pct_work_from_home]
at: [-100.9, 41.75, 7.2]
caption: "The Nebraska Sandhills, by county. Arthur, Grant, Hooker, Logan, McPherson and Blaine counties together hold 3,427 people. In Blaine County (422 people), 21.7% of workers work from home, likely anywhere from 11.5% to 31.8%."
```

Texas has 52 counties under 5,000 people; Kansas and Nebraska have 38 each; North and South Dakota, 30 each. For places this small, coarsening could mean a county's number is folded into a bigger area, and suppression means a blank.

## Why open methods matter

Mapwich's position is simple: data about the public should be collected openly, published as fully as privacy allows, and come with plain notes on how sure it is and how it was protected.

A range, even a wide one, is information. A planner can see that a tract's work-from-home share is "likely between 7% and 49%" and decide what to do with it: pool tracts, wait, or look for other evidence. A blank cell gives them nothing to weigh, and a number folded into a bigger area can't be split back out.

Openness about the method matters too. For the 2010 Census, the Bureau wrote in 2019, it had [never publicly stated](https://www.census.gov/newsroom/blogs/research-matters/2019/06/disclosure_avoidance.html) "how many households were swapped, or even the details of the algorithm." Moving to differential privacy, it promised ["dramatically improved transparency"](https://www.census.gov/newsroom/blogs/research-matters/2019/06/disclosure_avoidance.html) and released the source code of its 2018 test system. Coarsening and suppression are visible in their own way: you can see a blank. What users need is the rule behind each one.

What would help planners, whatever methods the Bureau uses:

- **A date** for the 2021–2025 5-year estimates.
- **The rules in public:** which tables and areas were coarsened or withheld, and why.
- **Margins of error kept** on every number that is published.
- **Tract and block-group tables kept** wherever privacy allows, rather than dropped wholesale.

## What Mapwich shows meanwhile

Every ACS map on Mapwich is from the 2020–2024 5-year estimates. Click a tract or county to see its margin; turn on **Hatch unreliable estimates** to see which tract numbers are thin. When the 2021–2025 file arrives, we'll note what changed in how it was protected.
