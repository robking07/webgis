---
title: "America's biking capital isn't where you think"
dek: "No county has a larger share of workers who bike to work than Holmes County, Ohio, where it's about one in seven. The county number is solid. Many of the neighborhood numbers behind it, here and elsewhere, are not."
topic: Commuting
date: 2026-10-27
datasets: [pct_bike_commute]
caption: "Share of workers 16 and over who usually biked to work, by county (ACS 2020–2024). Darker blue means a larger share. Holmes County, Ohio, has the highest estimate of the 3,222 counties. In 3,028 of them, fewer than 1% of workers bike."
method: |
  Every number from Mapwich data in the text was computed from Mapwich's published county and tract files with a script kept with this piece (`apps/web/scripts/specials-numbers/holmes-county-bikes.mjs`); the table of commuting shares is computed from the same files when the site is built. Margins of error are the Census Bureau's, at 90% confidence. Reliability grades follow Mapwich's rule: the coefficient of variation, (margin ÷ 1.645) ÷ estimate, under 15% is reliable, 15% to 30% "use with caution", over 30% unreliable; an estimate of zero is not graded. Earlier periods (2010–2014 and 2015–2019) have no margins of error on Mapwich, so changes over time are not tested. Approximate county populations are the 2020 Census count per square mile times land area. The distance from the University of Minnesota is measured from each tract's center point to a point on the East Bank campus (Northrop Auditorium).

  Mapwich maps counties and tracts, not cities, so the figures for the City of Minneapolis are not Mapwich data. They come from the Census Bureau's American Community Survey 5-year tables, retrieved from data.census.gov on 12 October 2026: shares with margins from table S0801 ([2020–2024](https://data.census.gov/table/ACSST5Y2024.S0801?g=160XX00US2743000), [2015–2019](https://data.census.gov/table/ACSST5Y2019.S0801?g=160XX00US2743000)), and the counts of workers and bike commuters for Minneapolis and Holmes County from table [B08301, 2020–2024](https://data.census.gov/table/ACSDT5Y2024.B08301?g=050XX00US39075,160XX00US2743000). Mapwich works out its share margins from these counts; for Holmes County that gives ±2.2 points, where table S0801 shows ±2.1. Portland's and Davis's shares and margins are worked out the same way from table B08301, 2020–2024 ([Portland](https://data.census.gov/table/ACSDT5Y2024.B08301?g=160XX00US4159000), [Davis](https://data.census.gov/table/ACSDT5Y2024.B08301?g=160XX00US0618100)), retrieved through [Census Reporter](https://censusreporter.org/) on 27 October 2026.

  Award and rating facts: the League of American Bicyclists' [2025 Bicycle Friendly Community report card for Minneapolis](https://bikeleague.org/wp-content/uploads/bfareportcards/bfc/2025/Minneapolis_MN.pdf) (award level, history, scoring areas, the city's own bike-share estimate) and its [award database](https://bikeleague.org/bfa/award-database/) (counts of current award holders and the absence of any Holmes County community, checked 12 October 2026); PeopleForBikes' [2026 City Ratings results](https://www.peopleforbikes.org/news/2026s-best-places-to-bike) (16 June 2026) and [methodology](https://www.peopleforbikes.org/news/2026-city-ratings-methodology) (28 April 2026), and its [Minneapolis page](https://cityratings.peopleforbikes.org/cities/minneapolis-mn). Portland's and Davis's first Platinum awards are from BikePortland's reports at the time ([2005](https://bikeportland.org/2005/09/28/california-city-is-first-to-platinum-487/), [2008](https://bikeportland.org/2008/04/29/portland-gets-platinum-becomes-first-major-us-city-to-win-the-award/)). The Holmes County Trail is described by the [Holmes County Chamber of Commerce](https://www.holmescountychamber.com/recreation/holmes-county-rails-trails-coalition).

  Amish settlement sizes and the counties each settlement covers are from the [Young Center for Anabaptist and Pietist Studies, Elizabethtown College](https://groups.etown.edu/amishstudies/twelve-largest-settlements-2024/) (2024 estimates; [by county](https://groups.etown.edu/amishstudies/files/2024/08/Amish-Pop-2024_by-state-and-county_c.pdf)). Which communities use bicycles or scooters is from Erik Wesner of Amish America, [*Do Amish people ride bicycles?*](https://amishamerica.com/do-amish-ride-bicycles/) (updated 2024) and [*Why do some Amish ride scooters (but not bicycles)?*](https://amishamerica.com/why-do-amish-ride-scooters-but-not-bicycles/) (2020, updated 2024); e-bikes in Holmes County from Kyle Barnett, [*Some Amish are embracing e-bikes*](https://mountvernonnews.com/stories/649415724-some-amish-are-embracing-e-bikes-as-a-form-of-transportation), Mount Vernon News (2023). Tract sizes are from the [Census Bureau's geography glossary](https://www.census.gov/programs-surveys/geography/about/glossary.html). This piece was drafted by Claude, an AI model, from Mapwich data, and reviewed by Robbie King before publication.
author: "Drafted by Claude for Robbie King"
draft: false
---

Ask people where Americans bike to work and most will name a big city or a college town. The county map says otherwise. The county with the largest share of workers who usually bike to work is Holmes County, Ohio: 14.0%, about one worker in seven, in the Census Bureau's American Community Survey for 2020–2024. Next is LaGrange County, Indiana, at 7.2%. San Francisco County is at 3.3%, the District of Columbia at 3.3%, and Multnomah County, Oregon, which includes Portland, at 2.8%.

Biking to work is rare almost everywhere. In 3,028 of the 3,222 counties, fewer than 1% of workers bike, and the typical county is at 0.09%. That is why a county of about 44,000 people stands out so sharply on the map.

## How sure can we be?

The survey reaches a sample of households, so every estimate has a margin of error and gives us a range of the real value as if we were able to ask everyone. Holmes County's is ±2.2 points. With 90% confidence, the true share is between 11.8% and 16.2%, and the estimate is graded reliable. Even the low end is above the top of LaGrange County's range (7.2% ±1.2), so the county ranking holds up.

Neighborhood numbers are another matter. A census tract [usually has between 1,200 and 8,000 residents](https://www.census.gov/programs-surveys/geography/about/glossary.html), and the survey reaches only some of their households. Of the 84,378 tracts with a bike-to-work estimate, 63,956 (76%) show zero. A zero usually means the survey found no bike commuters among the households it reached, not that nobody bikes. At the other end, the highest tract estimate in the country, 47.1% for a tract on Nantucket, has a margin of ±45.1 points. It is graded unreliable.

## Holmes County up close

```map
datasets: [pct_bike_commute]
at: [-81.88, 40.57, 9.2]
level: tract
caption: "Holmes County, Ohio, and its neighbors, by census tract. The high shares are on the county's east side; two tracts in the west show none. Turn on reliability hatching in the full map to see which tract numbers are shaky."
```

Inside the county, the numbers split east and west: three of the ten tracts are above one worker in five, all east or southeast of the center, and two in the west and southwest show zero.

Tract 9768.01, southeast of the center, is at 37.5% ±6.4, the highest tract estimate in the country that Mapwich grades reliable. Its neighbor, Tract 9768.02, is at 27.3% ±13.5: the true share could be anywhere from 13.8% to 40.8%, and it is graded unreliable. For areas this small, the county figure is the better guide.

## Bicycles and scooters

Holmes County gives its name to one of the country's largest Amish settlements: [40,435 people in 2024](https://groups.etown.edu/amishstudies/twelve-largest-settlements-2024/), by the estimate of the Young Center for Anabaptist and Pietist Studies at Elizabethtown College, reaching into Coshocton, Tuscarawas and Wayne counties. Only the Lancaster County, Pennsylvania, settlement is larger.

The census does not ask about religion, so the map cannot say who is riding. What it shows does line up with what has been written about Amish travel. Amish church communities set their own rules on technology, and they differ on bicycles. The guide Amish America [lists Holmes County](https://amishamerica.com/do-amish-ride-bicycles/), northern Indiana's Shipshewana and Nappanee areas, and Arthur, Illinois, among communities where bicycles are common. It lists Lancaster County, Geauga County in Ohio, Allen County in Indiana, and Dover, Delaware, among communities that use push scooters instead. Local reporting describes [electric bikes catching on in Holmes County](https://mountvernonnews.com/stories/649415724-some-amish-are-embracing-e-bikes-as-a-form-of-transportation), though not every church allows them.

Set beside the census numbers, the two lists split cleanly:

- **Bicycle communities.** LaGrange County, in the third-largest settlement (Elkhart-LaGrange, 29,180 people), is second in the country at 7.2% ±1.2. Douglas County, Illinois, in the Arthur-Arcola settlement, is 16th at 4.0% ±1.3.
- **Scooter communities.** Lancaster County is at 0.7% ±0.1, Geauga County at 0.1% ±0.1, and Allen County, Indiana, and Kent County, Delaware (Dover), near 0.3%.

One caution: Lancaster County has about 553,000 residents and Geauga about 95,000, so Amish workers are a much smaller share of all workers there than in Holmes. A county average shows a community's habits only where that community is a large part of the county.

Biking is not the only way these counties stand apart.

```table
type: counties
title: "How workers get to work, and households without a car"
counties: ["39075", "18087", "17041", "42071", "39055", "27053"]
columns: [pct_bike_commute, pct_walk_commute, pct_drive_alone, pct_zero_vehicle_households]
caption: "ACS 2020–2024. Holmes, LaGrange and Douglas counties are in settlements where bicycles are common; Lancaster and Geauga in settlements that use scooters. Hennepin County, Minnesota, includes Minneapolis."
```

In Holmes and LaGrange counties, fewer than half of workers drive alone (47.8% and 47.7%), and nearly a third of households have no vehicle (30.9% and 29.2%). Holmes County also has 6.9% walking to work; with biking, that's about one worker in five.

## Minneapolis, Portland and Davis, for comparison

The League of American Bicyclists has rated Minneapolis a Gold [Bicycle Friendly Community](https://bikeleague.org/wp-content/uploads/bfareportcards/bfc/2025/Minneapolis_MN.pdf) since 2011, most recently in 2025, and PeopleForBikes' [2026 City Ratings](https://www.peopleforbikes.org/news/2026s-best-places-to-bike) put it second among large U.S. cities.

By the Census Bureau's measure, [2.0% ±0.3 of Minneapolis workers](https://data.census.gov/table/ACSST5Y2024.S0801?g=160XX00US2743000) usually biked to work in 2020–2024, about 4,800 people. The city's own [2025 award application](https://bikeleague.org/wp-content/uploads/bfareportcards/bfc/2025/Minneapolis_MN.pdf) put its bike share at 2% to 5%, combining census figures, trip diaries and counts. Hennepin County, which also takes in the suburbs, is at 0.9% ±0.1.

```map
datasets: [pct_bike_commute]
at: [-93.255, 44.965, 11.2]
level: tract
caption: "Minneapolis, by census tract. The higher shares cluster around the University of Minnesota, east of downtown. Same colors as the Holmes County map."
```

Within the city, the higher tract numbers cluster near the University of Minnesota: the 24 tracts centered within 3 kilometers of campus have a middle value of 2.3%, while 165 of Hennepin County's 304 other tracts show zero.

The city's share has halved since [2015–2019, when it was 4.0% ±0.3](https://data.census.gov/table/ACSST5Y2019.S0801?g=160XX00US2743000), a drop far larger than the margins. Over the same years, the share working from home went from 5.8% to 26.2%, and the later survey years include the pandemic. These figures cannot say how much one change had to do with the other.

Two other cities share the top of the bike-friendly lists. Portland, Oregon, became the [first large U.S. city the League rated Platinum](https://bikeportland.org/2008/04/29/portland-gets-platinum-becomes-first-major-us-city-to-win-the-award/), in 2008, and is eighth among large cities in PeopleForBikes' [2026 City Ratings](https://www.peopleforbikes.org/news/2026s-best-places-to-bike). By the Census Bureau's measure, [3.4% ±0.3 of Portland workers](https://data.census.gov/table/ACSDT5Y2024.B08301?g=160XX00US4159000) usually biked to work in 2020–2024, about 12,000 people.

Davis, California, was the League's [first Platinum community of any size](https://bikeportland.org/2005/09/28/california-city-is-first-to-platinum-487/), in 2005. Its share is the highest of the three cities: [11.2% ±1.5](https://data.census.gov/table/ACSDT5Y2024.B08301?g=160XX00US0618100), about 3,700 workers. That range, 9.8% to 12.7%, overlaps Holmes County's (11.8% to 16.2%), so the survey can't say which is higher. Davis is a city and Holmes is a county, though: Yolo County, which takes in Davis, is at 4.9%.

```table
type: counties
title: "Bike to work across three survey periods"
counties: ["39075", "18087", "06113", "41051", "06075", "27053"]
columns: [pct_bike_commute@2014, pct_bike_commute@2019, pct_bike_commute]
caption: "ACS 5-year estimates for 2010–2014, 2015–2019 and 2020–2024. Margins of error for the two earlier periods aren't on Mapwich, so small changes may not be real."
```

Holmes County went the other way, from 8.1% to 14.0%, while its share working from home rose by less than one point; in 2015–2019 it ranked second, behind Mackinac County, Michigan. Mapwich has no margins for the earlier periods, so we can't say whether that jump is more than sampling noise. Part of the headline is a 2020s story.

## Why Holmes County isn't on the bike-friendly lists

If Holmes County leads the census measure, why isn't it on lists of the best places to bike? Part of the answer is that the lists measure something else.

The League's award starts with an application from a town, city or county. Reviewers score it in five areas: engineering, education, encouragement, evaluation and planning, and equity and accessibility. Each [report card](https://bikeleague.org/wp-content/uploads/bfareportcards/bfc/2025/Minneapolis_MN.pdf) also shows the share of commuters who bike, and reviewers told Minneapolis that evidence of more riding would be "critical" to reaching Platinum, the top level. The League's [award database](https://bikeleague.org/bfa/award-database/) lists 447 communities, including 19 counties and 21 places listed as rural. None is in Holmes County, and we found no record of a Holmes County application.

PeopleForBikes works from map data instead. Its [City Ratings](https://www.peopleforbikes.org/news/2026s-best-places-to-bike) score 3,019 cities on how well low-stress streets and paths inside city limits connect homes to jobs, shops, schools and other everyday places. How many people ride is [not part of the score](https://www.peopleforbikes.org/news/2026-city-ratings-methodology). The 2026 ratings have no page for Millersburg, the county seat, or other Holmes County villages we checked.

The census measure looks only at how workers usually get to work.

| | Holmes County, Ohio | Minneapolis |
|---|---|---|
| Workers 16 and over | 20,065 ±559 | 239,419 ±2,736 |
| Usually biked to work | 2,813 ±450 | 4,825 ±606 |
| Share who biked | 14.0% ±2.2 | 2.0% ±0.3 |
| League award | None | Gold since 2011 |
| PeopleForBikes rating, 2026 | No rated place | 68 out of 100 |

Minneapolis has about 12 times as many workers as Holmes County, but fewer than twice as many bike commuters.

The awards and ratings describe what a place has built and planned for people on bikes; the census describes how people get to work. They answer different questions. Holmes County does have the [Holmes County Trail](https://www.holmescountychamber.com/recreation/holmes-county-rails-trails-coalition), a paved rail trail shared by bicyclists, walkers, horseback riders and buggies.

## The top of the list, with margins

County estimates are steadier than tract estimates. Holmes County's lead is clear; below it, the margins overlap enough that the order could easily change.

| County | Bike to work (%) | Margin of error (points) | Grade |
|---|---|---|---|
| Holmes County, OH | 14.0 | ±2.2 | Reliable |
| LaGrange County, IN | 7.2 | ±1.2 | Reliable |
| Pitkin County, CO | 6.7 | ±2.1 | Use with caution |
| Presidio County, TX | 6.3 | ±4.7 | Unreliable |
| Grand County, UT | 6.3 | ±3.1 | Use with caution |
| San Juan County, CO | 5.9 | ±4.2 | Unreliable |

Of the 69 tracts nationwide with estimates of 15% or more, 46 are graded unreliable and only 6 reliable. Five of those six are in California, within 2 kilometers of the Stanford, UC Davis and UC Santa Barbara campuses. The sixth is in Holmes County.

## What the map can't tell us

The census counts how workers 16 and over usually got to work, not trips to school, the store or church. It can't say how many of Holmes County's bike commuters are Amish, and we couldn't find whether the survey tells people on electric bikes to answer "bicycle". Tract numbers rest on small samples. The county number, 14.0% ±2.2, is the solid one.

What the map does show is a small Ohio county where biking to work is about four times as common as in San Francisco, and where it goes with more walking and more households without a car.
