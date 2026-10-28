# Research notes: wildcard, dream big (R7)

Status: sections 0–1 done.
Next: write section 2 (best 8–12 developed).

Agent R7, 2026-10-27. Planning research for the next phase; the lead harvests it. Not for merge.
Sizes: S ≈ 100k tokens, M ≈ 275k, L ≈ 500k, XL ≈ 1M+. Running cost is the extra monthly bill on
top of today's (Vercel, Supabase free, R2, OpenFreeMap).

## 0. What Mapwich already has that makes big ideas cheap

The wildcard ideas lean on four things the base camp already built. They are why "dream big" here
costs tokens, not money:

1. **Everything a visitor sees is a static file on R2** (values per dataset, level and timeline
   stop; details per state; PMTiles). R2 has no egress fees. Anything that is "more files" (an open
   API, bulk downloads, embeds, time-lapse frames, print exhibits) adds almost no running cost.
2. **One registry drives everything.** A new output (API, changelog, feed, catalog page) is a new
   reader of the registry, not new bookkeeping.
3. **Timeline stops already exist** (2010–2014 onward, with 2019 boundaries for county and tract).
   Animation and "what changed" features are a new view over data already on R2.
4. **Specials have a verified-numbers pipeline** (script per piece, `check:special`). That's the
   seed of a repeatable newsroom.

**Timely fact that shapes the list (checked 2026-10-27).** Commerce Department order DAO 216-26
(June 2026) bans noise infusion in Census Bureau and BEA products and prefers "coarsening". The
Bureau delayed the 2025 ACS 1-year estimates, now set for **October 29, 2026** (tomorrow), and data
groups expect the 5-year release (normally December) to slip too; full transition by 2029. For a
site built on ACS 5-year tracts and block groups, this is both a risk (fewer, coarser small-area
numbers, maybe gaps) and an opening: very few places will show the public, plainly, what changed.
Sources: [Census release-date notice](https://www.census.gov/newsroom/press-releases/2026/dates-announced-for-2025-acs-1-year-estimates.html),
[Census director's blog on the policy](https://www.census.gov/newsroom/blogs/director/2026/08/understanding-the-new-disclosure-avoidance-policy.html),
[Census Project letter, 2026-09-04](https://thecensusproject.org/2026/09/04/over-100-incredibly-diverse-organizations-write-to-lutnick-critical-of-delay-in-acs-release/),
[PRB: what coarsening looks like](https://federaldataforum.prb.org/blogs/mark-mather/2026/07/15/what-does-coarsening-look-like?hlmlt=VT).
**Sensitive wording:** anything on this topic touches federal policy; the lead should route copy
to Robbie.

## 1. The long list

One line each. Grouped loosely; ★ = developed in section 2.

**Time and change**
1. ★ **Fifty years of a neighborhood**: tract time-lapse 1970–2020 on constant 2010 boundaries (Brown's Longitudinal Tract Database), play/scrub like a video.
2. **Animated change maps**: press play on any dataset with timeline stops; exports a GIF/MP4 for slides.
3. **"Then and now" swipe**: drag a divider across the map, 2014 left, 2024 right.
4. **Place biography**: one page per county that writes its own decade-by-decade story from the numbers (population, age, commute, income), with a line chart per topic.
5. **Disasters through time**: FEMA declarations 1953–today (#169 is built) as an animated year-by-year map.

**Sharing, embeds and print**
6. ★ **Embeddable maps**: an `<iframe>` code (and a static PNG) for any map view, for planners' reports, news sites and blogs, with source and link back.
7. ★ **Meeting exhibit generator**: one click turns the current view into a print-ready 24×36 or 11×17 PDF with title, legend, scale, north arrow, sources, margin notes.
8. **Slide export**: a 16:9 PNG of the current view with title and source baked in, sized for PowerPoint.
9. **Story maps**: chain saved views into a scrolling story (Specials already do a version; open it to Robbie's talks).
10. **"Cite this map"**: a ready citation (APA/Chicago and a plain sentence) with the data vintage and a permanent link.

**Open data**
11. ★ **Open data API and bulk downloads**: document the R2 files as a free, stable, versioned API (`/v1/values/...`) and offer one zip per dataset; a data dictionary per dataset.
12. **Datasette / DuckDB in the browser**: a "query it yourself" page that runs SQL over the Parquet files in the visitor's own browser (DuckDB-WASM), no server.
13. **Notebook starters**: a Python and R snippet on every dataset page that loads it in two lines.
14. **Mapwich on Hugging Face / Source Cooperative**: mirror the cleaned tables as an open dataset; citations and stars come to Robbie.

**Watching and news rhythm**
15. ★ **The data newsroom**: a calendar of federal releases and a short "what's new in this release" post within a week of each (ACS 1-year, 5-year, PLACES, FARS, LODES, NRI).
16. ★ **Data changelog + "watch a place"**: a public page listing every dataset update; visitors can follow a county or MPO by RSS or email and get "3 new numbers for Hennepin County."
17. ★ **The federal data record**: a tracker of what federal statistics changed, were delayed, coarsened or removed, with before/after maps where it matters (DAO 216-26, ACS 2025).
18. **Release-day auto-briefs**: a script that, on a release, ranks the biggest movers by county and drafts a fact sheet for Robbie to edit (not to publish untouched).

**3D, terrain, imagery, real time**
19. **Terrain and hillshade**: a free relief layer (Mapterhorn terrain PMTiles) under any map; 3D tilt for hazard maps (wildfire, flood).
20. **Extruded "data cities"**: 3D bars by tract for population or jobs, for a portfolio wow-shot.
21. **Live layers, clearly separate**: air quality now (AirNow), weather alerts (NWS), river gauges (USGS); a "Right now" tab, never mixed into the survey maps.
22. **Satellite change**: Landsat/NAIP before/after swipe for a place (new subdivisions, lost farmland).
23. **Night lights**: VIIRS night-light change by county as a proxy for growth.

**Accessibility and performance leadership**
24. ★ **The map that talks**: every map view comes with a written summary a screen reader can read ("Highest in the Black Belt of Alabama; lowest in suburban Virginia; Hennepin County ranks 412th of 3,222") plus a keyboard-navigable table.
25. **Sonification**: hear a choropleth (pitch = value) along a line you draw, or a county's trend.
26. **Fastest data map in America**: a public speed page (time to first map on a cheap Android over 3G) and a target; performance as a brand.
27. **Low-data mode**: a text-first version of every place page for slow phones.

**People and community**
28. ★ **Classroom kit**: five ready lessons (high school civics, AP Human Geography, intro planning) built on Mapwich maps with worksheets and an answer key.
29. **Community-contributed local layers**: planners upload a public local dataset (bike counts, crash hotspots) through a reviewed pull request; moderation by Robbie.
30. **"Ask the map guy"**: a monthly question from a visitor answered as a short Special.
31. **Planner field notes**: guest Specials from other planners, edited by Robbie.

**Insight engines (Library maps)**
32. ★ **The insight machine**: auto-generated, labeled "Library" findings for every dataset (outliers, clusters, biggest movers, unusual pairings) at county and tract level, each with a reliability check; Featured maps hand-shaped by Robbie sit on top.
33. **Hot spots, done right**: Local Moran's I / Getis-Ord clusters for every dataset, with "this cluster is real" vs "noise" labels using margins of error.
34. **Twin places**: "the 10 counties most like yours, anywhere in the US" (#291, parked) extended to tracts.
35. **Typology map**: cluster every tract into 8–12 named neighborhood types (k-means over 40 variables), a national neighborhood atlas.
36. **Gap finder**: "where the need is high and the service is low" (e.g. many zero-car households and far from a supermarket) as standing maps.

**Robbie's portfolio and profile**
37. ★ **The Mapwich method**: a public case study and conference talk ("building a national data map with AI agents, under $50 a month, in 2–4 hours a week"), with the decision log as evidence.
38. **Annual "State of US places" report**: once a year, a long-form Special with 10 maps, released for APA's National Planning Conference.
39. **Open-source kit**: package the static-tiles pipeline so any state DOT or MPO can stand up its own Mapwich-like viewer (F11 project kit, extended to the product).
40. **Peer-reviewed short paper**: the reliability-warnings approach (MOE in the UI) written up for a journal like *JAPA* or *Cartographic Perspectives*.

**Fork-shaped (separate paid products)**
41. **Grant-application map packs**: data and maps for a specific grant (RAISE, SS4A, CDBG) for one jurisdiction, auto-filled.
42. **Plan-content comparison** (already named in the roadmap "not now"): read MPO plans and compare their goals and projects.
43. **White-label viewer** for small MPOs and counties.

## 2. The best ideas, developed

## 3. Fork candidates and who would pay

## 4. Top 10, ranked by remarkable ÷ cost

## 5. Notes for the lead
