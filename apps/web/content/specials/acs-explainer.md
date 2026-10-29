---
title: "109 bike commuters, give or take 110: how to read a neighborhood survey number"
dek: "Neighborhood numbers from the American Community Survey often come with very wide ranges. What they mean, why they get so wide, and how to use the numbers anyway, using bike commuting in Hennepin County, Minnesota."
topic: How surveys work
date: 2026-10-27
datasets: [pct_bike_commute]
at: [-93.45, 45.0, 9.4]
caption: "Share of workers 16 and over who usually bike to work, by census tract, Hennepin County, Minnesota (ACS 2020–2024 5-year estimates)."
method: |
  Every number was computed from the U.S. Census Bureau's American Community Survey 2020–2024 5-year estimates with a script kept in the repository (`apps/web/scripts/specials-numbers/acs-explainer.mjs`). It reads the Bureau's public [table-based summary files](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/) (no API key): table B08301, Means of Transportation to Work (workers 16 and over); B98001, Unweighted Housing Unit Sample; B98021, Housing Unit Response Rates; and B25001, Housing Units. Geographies: Hennepin County's 329 census tracts (2020 boundaries) and their block groups, Minneapolis city, Hennepin County and Minnesota. The script checks every Hennepin tract's bike and drive-alone shares, and the example block groups, county and state, against the values Mapwich publishes; they match. Percentage margins use the Census Bureau's formula for a proportion. Reliability grades follow Mapwich's rule: coefficient of variation (CV) = (margin ÷ 1.645) ÷ estimate; under 15% reliable, 15–30% use with caution, over 30% unreliable; a zero is graded unreliable only when its margin is over 5 points. Outside sources: Census Bureau, [ACS sample size](https://www.census.gov/acs/www/methodology/sample-size-and-data-quality/sample-size/); [*Understanding and Using American Community Survey Data: What All Data Users Need to Know*](https://www.census.gov/programs-surveys/acs/library/handbooks/general.html) (2018), chapters [7](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch07.pdf) and [8](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch08.pdf); [*Multiyear Accuracy of the Data (5-year 2020–2024)*](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf); [user note on 2020 margins](https://www.census.gov/programs-surveys/acs/technical-documentation/user-notes/2022-04.html); [Summary File training transcript](https://census.gov/content/dam/Census/programs-surveys/acs/guidance/training-presentations/2017_SummaryFile_Transcript_01.pdf) (2017); [SAIPE](https://www.census.gov/programs-surveys/saipe/about.html). ONS, [*Income estimates for small areas, England and Wales*](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/smallareamodelbasedincomeestimates/latest) (December 2025) and [technical report](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/methodologies/incomeestimatesforsmallareasinenglandandwalestechnicalreportfinancialyearending2023). CDC, [PLACES methodology](https://www.cdc.gov/places/methodology/index.html) and [FAQ](https://www.cdc.gov/places/faqs/index.html). Statistics Canada, survey quality indicators (see note in the text). This piece was drafted by Claude, an AI model, and reviewed by Robbie King before publication.
author: "Drafted by Claude for Robbie King"
draft: false
---

In one census tract just south of downtown Minneapolis, the Census Bureau estimates that 109 workers usually bike to work. The margin of error is 110. Taken at its word, the true number is somewhere between 0 and 219.

A margin bigger than the number itself looks like a broken statistic. It isn't. It's an honest statement of how little a survey can say about one small neighborhood, and the same survey, read the right way, is still the best source there is. Here is why, using the 329 census tracts of Hennepin County, Minnesota.

## One home in 41

The American Community Survey (ACS) is the Census Bureau's ongoing survey of how Americans live: jobs, commutes, rent, income, health insurance, internet access and more. Unlike the census every ten years, it doesn't ask everyone. In 2024 it picked [3,543,672 addresses](https://www.census.gov/acs/www/methodology/sample-size-and-data-quality/sample-size/), about one home in 41, from the Bureau's master list of addresses. Small places are [sampled at higher rates](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf) and big, populous tracts at lower ones.

A single year is far too few answers for a neighborhood, so for small areas the Bureau pools five years. The newest set covers 2020 through 2024. Over those five years, 56,099 Hennepin County addresses were picked, about one home in 10, and 36,133 households completed the survey, about one home in 16. Spread across the county's 329 tracts, that is about 110 completed surveys per tract, on average.

## What the ± means

Every ACS number comes with a margin of error, published at 90% confidence. In the [Bureau's words](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch07.pdf), it gives a range "expected to contain the true or population value of an estimate 90 percent of the time." So "109 ± 110" means the true count is most likely between 0 and 219. A count can't be negative, so the low end stops at zero.

The margin only covers the luck of the draw: which homes happened to be picked. It doesn't cover questions misread or left blank, so the Bureau says its error measures are ["only lower bounds of the total error."](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf)

## Why small places get wide ranges

Two things make a range wide: few answers, and an uncommon answer. Bike commuting is uncommon: 0.89% of Hennepin's workers do it. In a tract, the survey may reach only a handful of households with a bike commuter, and each answer stands in for many homes; Hennepin has about 16 homes for every completed survey. Whether the survey happened to reach three of those households or six changes the estimate a lot, and the margin says so.

So a margin bigger than the estimate doesn't mean the survey talked to fewer people than the margin. It means the sample can say "some," but not how many.

Zeros work the same way. In 170 Hennepin tracts the estimate is zero bike commuters, with margins of 10, 14 or 16. The survey found none among the homes it reached; the margin, worked out by a [special method for zeros](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf), says there could still be a few.

In all, 278 of the 329 tracts have a bike-commuter margin larger than the estimate. Only one count passes the usual reliability test: tract 1040.01 in Southeast Minneapolis, 122 ± 28, likely between 94 and 150. Even there, the share of workers who bike only rates "use with caution," because the number of workers is an estimate too.

```map
datasets: [pct_bike_commute]
at: [-93.243, 44.972, 12]
level: tract
caption: "Central Minneapolis, by tract. Tract 59.02, just south of downtown: 7.7% of workers bike, likely between 0.1% and 15.4%. Tract 1040.01, east of the river: 6.0%, likely between 4.0% and 7.9%. Similar estimates, very different certainty."
```

The trouble is the uncommon answer, not the place. Ask the same tracts how many people drive to work alone, the most common answer, and the picture flips.

| Share of workers who… | Reliable (CV under 15%) | Use with caution (15–30%) | Unreliable (over 30%, hatched) | Zero, not graded |
|---|---:|---:|---:|---:|
| Bike to work | 0 | 4 | 155 | 169 |
| Work from home | 96 | 186 | 46 | 0 |
| Drive alone | 290 | 34 | 4 | 0 |

*Hennepin County's census tracts, graded as Mapwich grades them (CV is explained below); one tract has no workers. ACS 2020–2024, table B08301.*

```map
datasets: [pct_drive_alone]
at: [-93.243, 44.972, 12]
level: tract
caption: "Same area, share of workers who drive alone to work. Across Hennepin, 290 of these tract estimates are reliable; 4 are not."
```

## Zoom out and the range shrinks

Combine areas and the margin shrinks compared with the estimate. The table follows bike commuting from one block group, the smallest area the ACS reports, up to the state.

| Area | Workers 16+ | Share who bike | Likely between | Margin as a share of the estimate |
|---|---:|---:|---:|---:|
| Block group 3, tract 59.02 | 733 | 11.6% | 0% and 24.8% | 114% |
| Tract 59.02 | 1,410 | 7.7% | 0.1% and 15.4% | 99% |
| Minneapolis | 239,419 | 2.02% | 1.76% and 2.27% | 13% |
| Hennepin County | 686,167 | 0.89% | 0.80% and 0.97% | 10% |
| Minnesota | 2,939,889 | 0.47% | 0.44% and 0.49% | 6% |

*ACS 2020–2024, table B08301. Each row is a bigger place, not the same place seen more sharply, so the share itself changes too.*

Adding areas works because their sampling errors partly cancel out. To get the margin of a sum, the Bureau says to [square each margin, add them up and take the square root](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch08.pdf). Tract 59.02's three block groups estimate 0, 24 and 85 bike commuters, with margins of 10, 38 and 102. Added up, that's 109 with a margin of 109, almost exactly the 110 the Bureau publishes for the tract.

Do the same with all 329 tracts and you get the county's total, 6,080 bike commuters, with a margin of 627. The Bureau's own figure, worked out from the full survey records, is 610. The margin went from bigger than the estimate to about a tenth of it. The formula is an approximation, so when the Bureau publishes a figure for the bigger area, use that.

## Why it's still worth using

- **It's often the only source.** A Census Bureau trainer put it plainly: for tracts, block groups and other small areas, "the ACS is [often the only source of information](https://census.gov/content/dam/Census/programs-surveys/acs/guidance/training-presentations/2017_SummaryFile_Transcript_01.pdf)."
- **It's consistent.** The sample is drawn from [every county in the country](https://www2.census.gov/programs-surveys/acs/tech_docs/accuracy/MultiyearACSAccuracyofData2024.pdf) and processed with one set of methods, so a tract in Hennepin can be set beside one anywhere else.
- **People answer.** The Bureau reports a response rate of 82.7% for Hennepin County's sampled homes over 2020–2024.
- **It tells you how sure it is.** Every number arrives with its own margin. Many data sources give you a number and nothing else.

## Rules of thumb

1. **Read the range, not the number.** "Likely between 0.1% and 15.4%" says more than "7.7%."
2. **Size up the margin against the number.** If the margin is less than about a quarter of the estimate, the number is solid. Between a quarter and a half, use it with caution. More than half, treat it as a rough guide. Mapwich uses those cut-offs (statisticians call the measure behind them the coefficient of variation), though the Bureau itself says there are ["no hard-and-fast rules"](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch07.pdf).
3. **Combine areas** when single tracts are too fuzzy, with the formula above.
4. **Test a difference; don't eyeball it.** Tracts 59.02 and 1040.01 differ by 1.8 points, but the margin of that difference is 7.9 points, so the survey can't tell them apart. The Bureau warns that checking whether two ranges overlap ["will not always provide an accurate result."](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch07.pdf)
5. **Use the 5-year file for small areas.** Single-year estimates exist only for [areas of 65,000 people or more](https://www.census.gov/programs-surveys/saipe/about.html). A 5-year estimate is an average over the period, not a snapshot of its last year. Compare periods that don't overlap, such as 2015–2019 and 2020–2024. And 2020–2024 includes 2020, when the pandemic cut the survey to [about two-thirds of its usual responses](https://www.census.gov/programs-surveys/acs/technical-documentation/user-notes/2022-04.html), so its margins run wider.
6. **Treat percentages with care.** Both halves of a share are estimates: tract 59.02's 1,410 workers carry their own margin of 288.

## How Mapwich shows it

Click a tract and the details panel shows the estimate with its ±. When the margin is wide, it spells out the range: for tract 59.02, "Few households were surveyed here, so this is a range: likely between 0.09% and 15%." In the legend, **Hatch unreliable estimates** draws light stripes over tracts and block groups with a CV over 30% (or a zero with a margin over 5 points); the color still shows. On change-over-time maps, a change smaller than its margin of error is labeled **No clear change**. Mapwich doesn't yet have the published margins for earlier periods, so it estimates those from the latest one.

## How other surveys handle it

- **The UK** doesn't lean on survey answers alone. Its statistics office [estimates income for 7,264 neighborhoods](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/smallareamodelbasedincomeestimates/latest) in England and Wales by blending a household survey with the 2021 Census and government records. Every number still comes with a range, and the office tells you to look at those ranges any time you compare or rank places.
- **CDC PLACES**, where Mapwich's health maps come from, also uses a [statistical model](https://www.cdc.gov/places/methodology/index.html). It takes a big national health survey and predicts what each tract probably looks like, with a range for each. Those ranges come out narrower, but the model can't see what's happening on the ground, like a new local health program, so the CDC says not to use the numbers [to judge those programs](https://www.cdc.gov/places/faqs/index.html).

Models narrow the range by borrowing from other data; the ACS sticks to what people in each place said, and shows the cost in the width of its ranges. Either way, the good habit is the same: say how sure you are, next to the number, in plain words.

