---
title: "Work from home, work out more? What the county map can and can't tell us"
dek: "Counties where more people work from home have fewer adults who skip exercise altogether. The pattern is strong and it's real, but most of it follows income and education, and part of it is built into how the health numbers are made."
topic: Health
date: 2026-10-02
datasets: [pct_work_from_home, physical_inactivity]
pairing: pct_work_from_home__physical_inactivity
caption: "Work from home (2020–2024) against adults with no leisure-time exercise (2023), by county. Blue counties have many home workers and few non-exercisers; gold counties the reverse. 2,956 counties have both values; Kentucky and Pennsylvania are blank because the inactivity data has no county values for them."
method: |
  Every number in the text was computed from Mapwich's exported county values with a script kept in the repository (`apps/web/scripts/specials-numbers/work-from-home-and-exercise.mjs`); the chart and tables are computed from the same files when the site is built. Correlations are Spearman rank correlations (ρ). "Within states" removes each state's average rank first. "Holding income and education equal" is a partial rank correlation: both measures' ranks are adjusted for the ranks of median household income and the bachelor's degree share before they are compared. Virginia's independent cities count as counties, as the Census Bureau treats them. The inactivity estimates come from a statistical model ([CDC PLACES methodology](https://www.cdc.gov/places/methodology/index.html)); the survey question is on [CDC's measure definitions page](https://www.cdc.gov/places/measure-definitions/health-risk-behaviors.html). This piece was drafted by Claude, an AI model, from Mapwich data, and checked against that data before publication.
image: /specials/work-from-home-and-exercise.png
author: "Drafted by Claude for Robbie King"
draft: true
---

Look at the map above and two colors do most of the talking. Blue marks counties in the top third for the share of workers who work from home and the bottom third for adults who got no exercise at all in the past month. Gold marks the opposite: few home workers, many adults with no leisure-time activity. Blue is common in the West: 43 of Colorado's 64 counties are blue, and 29 of Washington's 39. About half of the 632 blue counties have 100 or more people per square mile. Gold is concentrated in the South. In Mississippi, 67 of 82 counties are gold, and 483 of the 596 gold counties nationwide are in 14 southern states from Texas to Virginia.

Across the 2,956 counties with both numbers, the link is strong: a rank correlation of −0.62. It is not just one region of the country against another, either. Comparing counties only with others in the same state, it is still −0.53.

So does working from home get people moving? The tempting story writes itself: no commute, more time for a walk. The county data can't confirm that story, and when you look closely, most of the pattern turns out to be about something else.

## How big the gap is

Sort the counties by their work-from-home share and cut them into ten equal groups of about 296 counties each. In the tenth with the fewest home workers (under 4.2% of workers), an average of 33.1% of adults report no leisure-time exercise. In the tenth with the most (16.4% and up), it's 20.8%. The steps in between fall almost without a break.

```chart
type: bins
x: pct_work_from_home
y: physical_inactivity
groups: 10
title: "Fewer adults skip exercise in counties where more people work from home"
caption: "Work from home is the share of workers 16 and over who usually worked from home (ACS 2020–2024). No leisure-time exercise is the age-adjusted share of adults who answered no to any exercise outside their job in the past month (CDC PLACES, 2023)."
```

That's a gap of about 12 percentage points, in a measure where the typical county sits at 26.5%. It's a big difference. What it doesn't tell us is why.

## Virginia, where the two line up

Virginia shows the pattern clearly. Across its 133 counties and independent cities the rank correlation is −0.72, stronger than the national figure. The close-up below runs from the Washington suburbs in the northeast to the rural counties of the southwest.

```map
datasets: [pct_work_from_home, physical_inactivity]
at: [-79.4, 37.9, 6.1]
caption: "Virginia and West Virginia, by county. Northern Virginia, at top right, is mostly blue: seven of its nine counties and independent cities. West Virginia, at left, is mostly gold, brown or dark: 47 of its 55 counties are in the top third for inactivity. Same colors as the main map."
```

In Arlington County, 35.3% of workers work from home and 15.1% of adults report no leisure-time exercise. In Giles County, in the southwest, 2.5% work from home and 24.9% report no exercise. Grayson County, also in the southwest, is at 5.2% and 31.3%.

But the same counties differ in plenty of other ways, and the table shows how much.

```table
type: counties
title: "Four counties in northern and central Virginia, four in the southwest"
counties: ["51013", "51107", "51059", "51003", "51071", "51035", "51077", "51167"]
columns: [pct_work_from_home, physical_inactivity, median_household_income, pct_bachelors_plus]
caption: "Median household income and the share of adults 25 and over with a bachelor's degree are ACS 2020–2024 estimates."
```

In the first four, median household incomes run from $104,400 to $181,800, and three in five adults or more have a bachelor's degree. In the four southwestern counties incomes are between $47,730 and $65,690 and fewer than one adult in five has a degree. Working from home, exercise, income and education all move together here. Any one of them could be standing in for the others.

## The northern Plains, where the pattern breaks

Now move to the Dakotas and eastern Montana. Here the link mostly disappears: within South Dakota the correlation is 0.03, essentially none; in North Dakota −0.14; in Montana −0.09.

```map
datasets: [pct_work_from_home, physical_inactivity]
at: [-102.3, 45.9, 5.1]
caption: "The Dakotas and eastern Montana, by county. Much of the region is blue or pale, but five South Dakota counties are dark: in the top third for both working from home and inactivity. Same colors as the main map."
```

Some of the highest work-from-home shares in the country are here, in places with very few people. Perkins County, South Dakota, about one person per square mile, has a work-from-home share of 32.9%, sixth-highest of the 2,956 counties and above Fairfax County's 28.7%. Yet its inactivity rate, 23.6%, is unremarkable. Kidder County, North Dakota, is similar: 22.1% working from home, 24.1% inactive.

These numbers likely mean something different from home office work in a suburb. The data here can't say what Perkins County's home workers do, but Census Bureau research has long found [self-employed workers overrepresented among home-based workers](https://www.census.gov/library/publications/2012/demo/p70-132.html), and in the 1960s most were family farmers and professionals. The exercise question matters too. It asks about activity "other than your regular job." Someone who works hard all day outdoors can answer no. Across the 417 counties nationwide with fewer than six people per square mile, the correlation is −0.33, about half the national figure.

In the region, inactivity follows income far more closely than working from home. Within South Dakota, the correlation between median household income and inactivity is −0.78. The two South Dakota counties with the highest inactivity rates, Todd (42.3%) and Oglala Lakota (41.7%), have median household incomes near $42,000 and work-from-home shares under 4%.

## It's older than the pandemic

If remote office work caused the pattern, you'd expect it to be weak before 2020. It wasn't. Using the 2015–2019 work-from-home shares, when the typical county had 4.5% of workers at home (against 8.7% in 2020–2024), the correlation with the 2023 inactivity estimates is already −0.51. With 2010–2014 shares it's −0.49. The places where people work from home have long been different kinds of places.

## Income, education and a model

Several other county measures line up with inactivity at least as strongly as working from home does, and they line up with working from home, too.

```table
type: correlations
title: "What else lines up with skipping exercise"
rows: [pct_work_from_home, per_capita_income, median_household_income, pct_bachelors_plus, pct_poverty, population_density, median_age]
with: [physical_inactivity, pct_work_from_home]
caption: "Income per person, household income and the bachelor's degree share each line up with inactivity more closely than working from home does, and each rises with working from home too. Population density and median age barely line up with inactivity."
```

When we hold income and education equal, comparing counties that rank alike on median household income and the bachelor's degree share, the link between working from home and inactivity shrinks from −0.62 to −0.22. Adding population density and median age brings it to −0.16. Within groups of counties at similar income levels it is between −0.36 and −0.56. Something is left, but most of the pattern is about who lives in a county, not how they get to work.

Age is a small factor partly by design: the inactivity rates are age-adjusted, so a county with many retirees is not marked down for it.

There's one more reason to be careful. The inactivity numbers aren't a direct count. CDC's PLACES project estimates them with a statistical model: it takes national survey answers and predicts each county's rate using its residents' age, sex, race and ethnicity, and education, plus the share of the county's adults living below 150% of the poverty line, from the same Census survey that measures working from home ([CDC PLACES methodology](https://www.cdc.gov/places/methodology/index.html)). So education and poverty are two of the model's inputs, and they are also two of the strongest companions of working from home. Part of the correlation is built in by the way the estimates are made. That does not make the pattern false, but the county estimates may line up with education and poverty more neatly than the true rates do.

One more thing we couldn't test: the mix of jobs. Some jobs can be done from home and many can't. If the ones that can are concentrated in the same counties as college graduates and higher incomes, that alone would produce much of this pattern. Mapwich doesn't have county occupation data yet, so we can't separate the job from the person doing it.

## What the map can't tell us

None of this shows that working from home makes anyone more active, or less. A correlation across counties is a statement about places, not people. The home workers in Arlington and the non-exercisers in Grayson County may not be the same people at all. Answering the real question would take data that follows individuals: how they work, and how they spend the time they don't spend commuting.

What the map does show is useful on its own. Places where working from home is common tend to be places where more adults stay active, and both tend to be places with more money and more college degrees. Where that bundle comes apart, as on the northern Plains, the work-from-home number stops predicting much at all.
