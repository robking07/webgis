---
title: "Traffic death rates run highest where the fewest people live"
dek: "About 41,000 people a year died in U.S. traffic crashes from 2020 to 2024. Per resident, the toll is several times higher in thinly settled counties than in big cities, and serious injuries, which are far more common, have no national county map at all."
topic: Transportation
date: 2026-10-20
datasets: [traffic_fatalities]
caption: "Average yearly traffic deaths per 100,000 residents, 2020–2024, by county (NHTSA FARS). Darker purple means a higher rate; each shade holds a fifth of counties, and the darkest starts at 30.7. Deaths are counted where the crash happened. Connecticut is blank because its crash records use the old county codes."
method: |
  Every number from Mapwich data in the text was computed from Mapwich's exported state and county values with a script kept in the repository (`apps/web/scripts/specials-numbers/traffic-deaths.mjs`); the chart and table are computed from the same files when the site is built. Mapwich stores rates, not counts. Death counts in the text are rebuilt from the rates the same way the rates were made: rate × residents ÷ 100,000, with residents from the ACS 2020–2024 population (2015–2019 for years before 2020). National figures are rebuilt from state values, so they can differ by a few dozen deaths from NHTSA's published totals. Deaths per mile driven divide 2020–2024 average deaths by 2024 vehicle miles on counted roads (FHWA HPMS), which leave out some local roads, so they run higher than NHTSA's national figures. Statements that one measure "tends to" rise with another rest on Spearman rank correlations (density and death rate: −0.52 nationally, −0.59 within states, which removes each state's average rank first; miles per resident and density: −0.46; miles per resident and death rate: 0.50; share of Native residents and death rate: 0.08). Outside figures: NHTSA, [*Overview of Motor Vehicle Traffic Crashes in 2023*](https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813705) (DOT HS 813 705) and [*Rural/Urban Comparison of Traffic Fatalities: 2022 Data*](https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813599) (DOT HS 813 599); FHWA, [*National Performance Management Measures: Highway Safety Improvement Program*](https://www.federalregister.gov/documents/2016/03/15/2016-05202/national-performance-management-measures-highway-safety-improvement-program), 81 FR 13882 (2016); [CDC, Tribal Road Safety](https://www.cdc.gov/tribal-road-safety/about/index.html); [National Park Service, Fort Wingate Historic District](https://www.nps.gov/places/fort-wingate-historic-district.htm); U.S. Senate Committee on Indian Affairs, [*Enhancing Tribal Self-Governance and Safety of Indian Roads*](https://www.govinfo.gov/content/pkg/CHRG-116shrg36243/html/CHRG-116shrg36243.htm), S. Hrg. 116-15 (2019); [University of Arizona, Native American Advancement, Initiatives and Research: Navajo Nation](https://naair.arizona.edu/navajo-nation). This piece was drafted by Claude, an AI model, from Mapwich data, and reviewed by Robbie King before publication.
author: "Drafted by Claude for Robbie King"
draft: false
---

From 2020 through 2024, about 41,000 people a year died in motor vehicle crashes in the United States: 12.3 for every 100,000 residents, according to [NHTSA's Fatality Analysis Reporting System](https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars). The map above shows where those crashes happened, county by county.

By state, Mississippi has the highest rate, 25.1 deaths per 100,000 residents a year, followed by Wyoming (21.4), Arkansas (20.9), New Mexico (20.7) and South Carolina (20.6). Massachusetts has the lowest, 5.4, with Rhode Island, New York, the District of Columbia and Hawaii close behind. Mississippi's rate is 4.7 times Massachusetts's.

## A rise, then a slow fall

Deaths jumped during the pandemic. The national rate went from 11.2 per 100,000 in 2019 to 12.9 in 2021, when about 43,200 people died, the highest single year from 2014-2024. It has fallen every year since, to 11.7 in 2024, but that is still higher than any year from 2015 to 2019.

| Year | Traffic deaths per 100,000 residents |
|---|---:|
| 2015 | 10.9 |
| 2016 | 11.6 |
| 2017 | 11.5 |
| 2018 | 11.3 |
| 2019 | 11.2 |
| 2020 | 11.6 |
| 2021 | 12.9 |
| 2022 | 12.8 |
| 2023 | 12.2 |
| 2024 | 11.7 |

*National rate for each year, from NHTSA's FARS files. 2015–2019 use the 2015–2019 ACS population; 2020–2024 use the 2020–2024 population.*

## Fewer people, higher rates

The clearest pattern on the map is density. Sort the 3,135 counties with a value by people per square mile and cut them into ten equal groups. In the least crowded tenth, under 4 people per square mile, the typical county's rate is 34.9. In the most crowded tenth, 427 people per square mile and up, it is 8.4, about a quarter as high.

```chart
type: bins
x: population_density
y: traffic_fatalities
groups: 10
stat: median
title: "Traffic death rates fall as counties get more crowded"
caption: "Median county traffic death rate (2020–2024 yearly average, NHTSA FARS) in each tenth of counties, sorted by people per square mile (ACS 2020–2024). Medians, because a few tiny counties have extreme rates."
```

It isn't just rural states against urban ones. Inside each state, the emptier counties still tend to have the higher death rates, and the pattern is a little stronger within states than across the country as a whole. Counties with fewer than 50 people per square mile hold 8.8% of the people but 17.3% of the deaths, a combined rate of 24.1. Counties with 500 or more hold 54.2% of the people and 39.1% of the deaths, a combined rate of 8.9.

Driving goes along with it. People in emptier counties tend to drive more, and counties with more driving per resident tend to have higher death rates. Per mile driven, though, the gap narrows but doesn't close. Dividing deaths by miles driven on counted roads gives 1.73 deaths per 100 million vehicle miles in the least crowded tenth of counties and 1.16 in the most crowded. NHTSA's own figures for 2022 show a similar gap: [1.68 deaths per 100 million miles in rural areas and 1.15 in urban ones](https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813599). Rural areas held about 20% of the population and 41% of the deaths, and about two-thirds of rural deaths were in crashes where a vehicle left its lane or the road.

## Counted where the crash happens

The rate on this map divides deaths where crashes happened by the people who live there. Where few people live and many drive through, the rate can soar. West Texas shows it most clearly.

```map
datasets: [traffic_fatalities]
at: [-103.8, 31.2, 6.6]
caption: "West Texas, by county. Same colors as the main map. Of the 27 Texas counties west of 101°W and south of 33°N, 23 are in the darkest shade. The four exceptions, El Paso, Midland, Ector and Val Verde, are the area's four most populous counties."
```

Loving County, Texas, had 64 residents in the 2020 Census, and the ACS estimate is 33. Nineteen people died in crashes there over the five years, so its rate is 11,520 per 100,000, by far the highest in the country. Its counted roads carry 7,113 vehicle miles a day for every resident, 236 times the typical county. Hudspeth and Culberson counties, east of El Paso, had 71 deaths between them and about 5,600 residents. Their rates, 258.6 and 246.0, say as much about the traffic passing through as about the people who live there.

Small numbers matter too. In a county of 2,000 people, one more death in five years moves the yearly rate by 10. Of the 46 counties with rates above 100, 44 have fewer than 10,000 residents. And 31 counties had no traffic deaths at all from 2020 to 2024.

```table
type: counties
title: "Seven counties, from nearly empty to very crowded"
counties: ["48301", "48229", "04001", "35031", "47157", "27053", "36061"]
columns: [traffic_fatalities, vmt_per_capita, population_density]
caption: "Vehicle miles per resident: daily miles driven on counted roads in the county, per resident (FHWA HPMS 2024). Shelby County, Tennessee, home to Memphis, is a reminder that density isn't everything."
```

Shelby County's rate, 26.6, is 2.2 times the national rate, the ninth-highest of the 607 counties with 100,000 or more residents. New York County (Manhattan), at 2.3, and Arlington County, Virginia, at 2.2, have the lowest.

## The Four Corners

A second cluster stands out in the Southwest, and through-traffic doesn't explain it the same way.

```map
datasets: [traffic_fatalities]
at: [-109.8, 36.0, 6.4]
caption: "The Four Corners, by county. Same colors as the main map. Apache, Navajo and Coconino counties in Arizona, McKinley and Cibola in New Mexico, and San Juan County, Utah, are all in the darkest shade."
```

Apache, Navajo and Coconino counties in Arizona and McKinley County in New Mexico each have rates between 36.9 and 38.6, roughly twice their states' rates (Arizona 16.5, New Mexico 20.7). Together they recorded 730 deaths in five years. Their vehicle miles per resident, 35 to 47 a day, are only modestly above the typical county's 30. Much of the Navajo Nation, [the largest reservation in the United States](https://naair.arizona.edu/navajo-nation), lies in these counties; in Apache and McKinley counties, 71% and 75% of residents are American Indian (ACS 2020–2024).

Nationally, counties with more Native residents don't consistently have higher death rates, partly because the 12 Alaska counties where Native residents are a quarter or more of the population have low rates (median 5.9). Outside Alaska, the 35 such counties have a combined rate of 37.3, about three times the national rate.

The [CDC reports](https://www.cdc.gov/tribal-road-safety/about/index.html) that American Indian and Alaska Native people have the highest motor vehicle death rates of any racial or ethnic group. The roads they travel have a history. In the 1860s the U.S. Army forced thousands of Navajo people on a 400-mile march, the Long Walk, to the Bosque Redondo Reservation in New Mexico; a treaty in 1868 let them [return home](https://www.nps.gov/places/fort-wingate-historic-district.htm). Today the Bureau of Indian Affairs runs a road system on tribal lands. At a [2019 Senate hearing](https://www.govinfo.gov/content/pkg/CHRG-116shrg36243/html/CHRG-116shrg36243.htm), it said about 17,130 miles of those roads were unimproved earth roads, with $392 million in deferred maintenance in 2018. The Federal Highway Administration told the same hearing that "many Tribes are not adequately represented in State and national crash databases," so counts like these may be low.

## Serious injuries: the map we don't have

For every traffic death there are many more serious injuries, but there is no national county map of them, and Mapwich doesn't have one. FARS, the source of the death counts, covers fatal crashes only. NHTSA estimates injuries from a sample of police crash reports: [about 2.44 million people were injured in 2023](https://crashstats.nhtsa.dot.gov/Api/Public/ViewPublication/813705), about 60 for every death. Those are national estimates, not county ones, and they count injuries of every severity.

Serious injuries are counted by the states. A [2016 federal rule](https://www.federalregister.gov/documents/2016/03/15/2016-05202/national-performance-management-measures-highway-safety-improvement-program) requires every state transportation department to track the number of serious injuries, using a common definition taken from police crash reports, and to set targets on five-year averages. Those counts sit in each state's own crash records, and Mapwich hasn't brought them together.

## What the map can't tell us

This map counts deaths where crashes happened, not where the people who died resided. It can't say who was driving, how fast, or why a crash happened, and it can't separate the road from the traffic on it. A county's rate can also swing on a handful of crashes.

What it does show is steady. Traffic deaths per resident are highest in the emptiest counties, and the gap holds within states and per mile driven. In a few places the numbers mostly reflect traffic passing through. In others, like the Navajo Nation, they fall on the people who live there.

