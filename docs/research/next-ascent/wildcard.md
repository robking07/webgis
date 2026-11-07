# Research notes: wildcard, dream big (R7)

Status: complete (all sections).
Next: nothing; the lead harvests.

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

Eleven ideas. Fields: **Sees/does** · **Robbie's weekly use** · **Size** · **Running cost** ·
**Fork?** · **Builds on**. Estimates assume the current static-files design holds.

### 2.1 The federal data record (long-list #17)
- **Sees/does:** a standing page, "What changed in federal data", with one dated entry per event:
  delayed, coarsened, discontinued, removed or revised (ACS 2025 under DAO 216-26 is entry one; the
  uninsured table drop from #133 is entry two). Where it matters, a before/after map: e.g. how many
  tracts in a county lost a published value between the 2020–2024 and 2021–2025 releases, or how
  much wider the ranges got. Neutral tone, facts and sources only.
- **Weekly use:** high in the next 18 months. Robbie's own maps depend on these releases; this is
  the page that tells him (and other planners) what he can still trust and why a map went blank.
- **Size:** M (≈275k) for the page, the entry format and the first two before/after comparisons;
  then S per event. The data-scout's release watch already does the noticing.
- **Running cost:** $0 (static Markdown + values already on R2).
- **Fork?** No. This is public-good work and portfolio gold.
- **Builds on:** data-scout release watch, timeline stops, reliability warnings (D-222), the
  Specials pipeline. **Sensitive:** federal policy; every entry's wording goes to Robbie.

### 2.2 The data newsroom and release-day auto-briefs (#15, #18)
- **Sees/does:** a public release calendar (ACS 1-year and 5-year, PLACES, FARS, LODES, NRI, CDC
  WONDER) and, within a week of each release, a short "What's new" post: three maps that moved, the
  biggest county movers, one surprise, with reliability checks. Over time, a recognizable rhythm.
- **Weekly use:** high. It gives Robbie a standing reason to open Mapwich, and every release brief
  is a seed for a Special (the 1–2/month target by March 2027).
- **Size:** S (≈100k) for the calendar page; M (≈275k) for a reusable "movers" script that diffs
  two timeline stops for any dataset and writes a draft fact sheet with numbers checked the
  `check:special` way. Then ≈50–100k per release for the editor's draft, Robbie edits.
- **Running cost:** $0.
- **Fork?** No (the custom-alert version is; see section 3).
- **Builds on:** change maps (1.2), `specials-numbers` scripts, data-scout release watch.
- **Now-ish:** the 2025 ACS 1-year lands 2026-10-29. Mapwich doesn't carry 1-year data (65,000+
  population only), so the first real test is the 2021–2025 5-year release, whenever it comes.

### 2.3 Embeddable maps and slide images (#6, #8, #10)
- **Sees/does:** a Share → "Embed" option gives an `<iframe>` code for the current view (no menus,
  legend + source + "Open in Mapwich" link) and a "Download image" for a 16:9 slide PNG with title,
  legend and source. A "Cite this map" line comes with both.
- **Weekly use:** high. This is how a planner's map leaves the website and enters a staff report,
  a deck or a council packet, which is where Robbie actually uses maps.
- **Size:** M (≈275k): an `/embed` route reusing the map page with chrome off, and an image export
  (canvas to PNG with a layout frame; the `/og` routes already compose images).
- **Running cost:** $0–5. Embed traffic hits R2 and the basemap, not Vercel functions. Risk: a
  viral news embed leans on OpenFreeMap's free service with no SLA; the self-hosted basemap (S4,
  Protomaps PMTiles on R2) removes it for about $0–2/month.
- **Fork?** Partly: branded, custom-styled embeds for newsrooms or consultants (section 3).
- **Builds on:** ShareButton, link previews (1.5), `/og` image routes, URL state.

### 2.4 Meeting exhibit generator (#7)
- **Sees/does:** "Print exhibit" on any view: pick 11×17, 24×36 or letter; get a print-ready PDF
  at 300 dpi with title, subtitle, legend, scale bar, north arrow, sources, date, reliability note
  and an optional inset of the region. The board you pin up at a public meeting.
- **Weekly use:** medium-high. Planners make these all the time in ArcGIS Pro; one click from a
  phone or laptop is a genuine time saver and a striking demo.
- **Size:** M–L (≈275–450k): high-resolution offscreen render with MapLibre, a fixed layout grid
  from `packages/design` tokens, client-side PDF (no server).
- **Running cost:** $0 (all in the browser).
- **Fork?** Yes for a "consultant pack" (logos, custom layers, batch exhibits for 20 areas).
- **Builds on:** design tokens, legend and classify code, the embed work (do 2.3 first).

### 2.5 Open data API and bulk downloads (#11, #12, #13)
- **Sees/does:** a "Use the data" page: stable, versioned URLs (`/v1/...`) for every dataset,
  level and period, one zip or Parquet per dataset, a data dictionary, a Python and an R snippet on
  each dataset page, and an optional in-browser SQL box (DuckDB-WASM over the Parquet files).
- **Weekly use:** medium. Robbie himself pulls tract tables into ArcGIS/Excel; one clean link
  beats the Census API for the 138 datasets. Big for profile: developers and researchers cite APIs.
- **Size:** M (≈275k) for the contract, docs, Parquet export and snippets; +S for the SQL box.
- **Running cost:** $0–5. R2 egress is free; reads are free to 10M/month, then $0.36 per million.
- **Fork?** Only an SLA'd commercial API (section 3); the free one stays free.
- **Builds on:** S2 (data files on R2), CSV download (1.4), `/data/[id]` profiles, registry.
- **Caution:** once published, paths are a promise; version them from day one.

### 2.6 Data changelog and "watch a place" (#16)
- **Sees/does:** a public "What's new" page listing every dataset added, refreshed or corrected
  (generated from the registry and git history), and a "Follow this place" button that gives an
  RSS feed per county, MPO or dataset ("4 new numbers for Hennepin County, MN"). Email later.
- **Weekly use:** medium. Robbie follows his own region; the feed is also the honest record of
  what changed and when, which supports trust.
- **Size:** S–M (≈100–200k) for changelog + static RSS feeds written at export. Email adds S plus
  a provider.
- **Running cost:** RSS $0. Email: free tiers (e.g. Resend ~3,000/month, Buttondown 100 subscribers)
  cover early use; collecting addresses means a privacy note and unsubscribe handling, so start
  with RSS.
- **Fork?** The rich-alert version (thresholds, many places, real estate and site-selection use).
- **Builds on:** registry, exportweb, timeline stops.

### 2.7 Fifty years of a neighborhood (#1, #2, #3)
- **Sees/does:** pick a tract, press play: population, race and ethnicity, homeownership, income,
  education from 1970, 1980, 1990, 2000, 2010 and 2020, all on the same 2010 boundaries, animate
  across the map. A "then/now" swipe, and a line chart for the clicked tract.
- **Weekly use:** medium. Planners constantly need "how did this area change" for plan
  background chapters; nobody free does it this smoothly. Very strong Special material (urban
  renewal, highway building, suburbanization). Sensitive topics: redlining and displacement
  wording needs Robbie.
- **Size:** L (≈500k): new ingest for the Longitudinal Tract Database (Brown University, 1970–2020
  harmonized to 2010 tracts), decade timeline stops, a play control and swipe on the map. The 2010
  tract boundaries are already on R2 (the "2019" boundary set), which is the expensive part.
- **Running cost:** $0–1 (a few hundred MB more on R2, inside the free 10 GB).
- **Fork?** No.
- **Builds on:** timeline stops, `boundaries: "2019"`, TimeControl, change maps.
- **License check (D-16):** the LTDB download page shows no explicit license; ask Brown's S4 or use
  only with written permission. Do **not** use IPUMS NHGIS as the source: its terms forbid
  redistribution without permission ([NHGIS terms](https://www.nhgis.org/ipums-nhgis-terms-use)).

### 2.8 The map that talks (#24, #25)
- **Sees/does:** every map view gets a plain-language summary under the map ("Highest in the
  Mississippi Delta and along the Texas border; lowest in suburban Washington, D.C. Your selection,
  Hennepin County, ranks 412th of 3,222, middle fifth"), read by screen readers and handy for
  everyone. A keyboard-only table mode. Stretch: "listen" to a trend (sonification).
- **Weekly use:** medium. Robbie gets an instant read of a pattern before a meeting; the summary
  doubles as alt text for embeds and exhibits. Leadership: none of PolicyMap, Social Explorer or
  data.census.gov does this well. A talk-worthy accessibility story.
- **Size:** M (≈275k): deterministic text from values (regions of the top and bottom fifth, rank,
  state pattern), no AI needed; sonification +S.
- **Running cost:** $0.
- **Fork?** No.
- **Builds on:** DataTable, classify, ranks in DetailPanel, accessibility fixes in #187.

### 2.9 The insight machine: Library maps at scale (#32–#36)
- **Sees/does:** for every dataset, automatic labeled findings ("Library"): outliers, statistically
  real clusters (Getis-Ord / local Moran's I, gated by margins of error), biggest movers between
  periods, "places like this", and a national neighborhood typology (each tract in one of ~10
  named types). Robbie's hand-shaped Featured maps sit on top; Library pages are clearly labeled
  "computed, not reviewed".
- **Weekly use:** high once built: "what's unusual about this county" in one click.
- **Size:** XL (≈1M+) across phases; first slice (outliers + movers for county level) M.
- **Running cost:** $0 to run in the offline pipeline; static outputs.
- **Fork?** No (the typology could later be a paid market-segmentation fork).
- **Builds on:** Combinations (D-447 automatic checks), similar places #291, reliability warnings.
- **Overlap:** the data-at-scale agent likely covers this; I list it because it's the spine of
  Robbie's "overwhelming data plus insight" ask.

### 2.10 Classroom kit (#28)
- **Sees/does:** a "Teach with Mapwich" page: five 45-minute lessons (AP Human Geography,
  civics, intro statistics, environmental science, intro planning) with a worksheet, a map link
  per question and an answer key. The ACS explainer Special is already lesson-shaped.
- **Weekly use:** low. Worth it anyway: it is the most direct proof of "free and educational", and
  teachers share widely. Teacher feedback is also a cheap usability test.
- **Size:** M (≈275k) for five lessons, mostly writing; Robbie reviews.
- **Running cost:** $0.
- **Fork?** No (an LMS-integrated version could be, but keep Mapwich free).
- **Builds on:** Specials, share links, compare.

### 2.11 The Mapwich method: case study, talk and kit (#37–#40)
- **Sees/does:** an About → "How this was built" case study: a national data map run by one
  planner with AI agents, 2–4 hours a week, under $50 a month, with the decision log, budgets vs
  actuals and the mistakes. Turned into a conference talk (APA National Planning Conference, Esri
  UC, FOSS4G NA, a state APA chapter) and a short paper on showing survey uncertainty on maps.
- **Weekly use:** indirect. The single biggest lever for "raise Robbie's profile as a GIS leader".
- **Size:** S–M (≈100–200k) to assemble from `docs/` and progress logs; Robbie writes the voice.
- **Running cost:** $0 (conference travel is Robbie's call).
- **Fork?** The packaged kit (F11) could become a paid "AI-run project kit" or workshop.
- **Builds on:** docs/decisions, progress log, F11 project kit, usage log.

**Honorable mentions, cheap:** terrain hillshade under hazard maps using free Mapterhorn terrain
tiles (S, $0; [Protomaps blog](https://protomaps.com/blog/mapterhorn-terrain/)); animated GIF
export of change maps (S); "Right now" live tab for air quality and weather alerts (M, $0–5, keep
separate from survey maps); annual "State of US places" report (M per year, Specials pipeline).

## 3. Fork candidates and who would pay

Rule: a Fork is a separate paid product; Mapwich never gets a paywall. Price anchors (third-party
listings, unconfirmed): Social Explorer individual plans about $135–195/month and library plans
about $1,350–7,200/year; PolicyMap quotes on request, with older public figures of $5,500–8,000
a year ([Capterra](https://www.capterra.com.au/software/1039593/social-explorer),
[Library Journal](https://libraryjournal.com/story/social-explorer-reference-ereview),
[PolicyMap pricing](https://www.policymap.com/pricing)).

| Fork candidate | Who pays | Why they'd pay | Builds from |
|---|---|---|---|
| **Grant map packs** (#41) | Small cities, counties, tribes and the consultants writing SS4A, RAISE, CDBG and FTA applications | Every application needs the same equity, safety and demographic maps; done in an hour, not a week | Exhibit generator, CEJST/SVI, FARS |
| **Consultant exhibit pack** (from 2.4) | Planning and engineering consultants | Branded, batch-printed meeting boards for many study areas | Exhibit generator |
| **White-label viewer / open kit with support** (#39, #43) | Small MPOs, RPCs, county GIS shops | A modern public data viewer without an Esri Hub budget | The whole static pipeline |
| **Plan-content comparison** (#42) | MPOs, state DOTs, advocacy groups, researchers | Compare goals, targets and projects across LRTPs and TIPs | MPO plans catalog (2.8) |
| **Place alerts, pro** (from 2.6) | Real-estate analysts, site selectors, economic developers | Threshold alerts across hundreds of places when releases land | Changelog and watch |
| **Commercial API with SLA** (from 2.5) | Proptech and civic-tech startups | Uptime promise and support on clean, harmonized tables | Open API |

Strongest fork by fit and demand: **grant map packs**. It's planner work Robbie knows cold, the
buyers have grant money earmarked for exactly this, and it reuses Mapwich features without
changing them. Weakest: commercial API (low margin, support burden).

## 4. Top 10, ranked by remarkable ÷ cost

Scoring: remarkable 1–5 (would a planner, a reporter or a hiring manager say "I've never seen
that on a free site"?) divided by cost points (S = 1, M = 2, L = 3, XL = 5; running cost above
$5/month would add a point, and none does). Ties broken by Robbie's weekly use.

| Rank | Idea | Remarkable | Size (tokens) | Score | Weekly use |
|---|---|---|---|---|---|
| 1 | **The Mapwich method**: case study + talk + paper (2.11) | 4 | S–M (100–200k) | 2.7 | indirect |
| 2 | **The federal data record**: what changed in federal data, with maps (2.1) | 5 | M (≈275k), then S per event | 2.5 | high |
| 3 | **Data newsroom + release-day auto-briefs** (2.2) | 4 | S + M (≈375k), then 50–100k per release | 2.0 | high |
| 4 | **Embeddable maps and slide images** (2.3) | 4 | M (≈275k) | 2.0 | high |
| 5 | **The map that talks**: written summaries for every view (2.8) | 4 | M (≈275k) | 2.0 | medium |
| 6 | **Data changelog + follow a place by RSS** (2.6) | 3 | S–M (100–200k) | 2.0 | medium |
| 7 | **Open data API + bulk downloads** (2.5) | 4 | M (≈275k) | 2.0 | medium |
| 8 | **Fifty years of a neighborhood** (2.7) | 5 | L (≈500k) | 1.7 | medium |
| 9 | **Meeting exhibit generator** (2.4) | 4 | M–L (275–450k) | 1.6 | medium-high |
| 10 | **The insight machine**: Library maps at scale (2.9) | 5 | XL (1M+); first slice M | 1.0 | high |

Just outside: classroom kit (1.5), terrain hillshade (2.0 but remarkable only 2), animated GIF
export (2.0, folds into 2.3).

**Total for the whole top 10:** about 3.5–4M tokens, all at $0–10/month extra running cost.

## 5. Notes for the lead

**A Next phase this list suggests: "Release season" (about 1–1.2M tokens, $0–5/month).** The
2025 ACS 1-year lands 2026-10-29 and the 2021–2025 5-year is likely delayed under DAO 216-26.
Build, in order: (1) data changelog + RSS (S–M), (2) newsroom calendar + movers script (M),
(3) the federal data record page with its first two entries (M; Robbie approves wording),
(4) embeds and slide images (M), so every release brief can travel into staff reports and news
stories. Each step serves Robbie's weekly use, feeds 1–2 Specials a month, and is cheap to run.
The Mapwich method case study runs alongside, written mostly by Robbie.

**Vision items (1–2 years):** fifty years of a neighborhood (L), meeting exhibit generator
(M–L), the map that talks (M), open API (M), insight machine (XL over phases), classroom kit (M),
grant map packs as the first Fork (separate repo, priced, waits for Robbie).

**Risks and dependencies**
- ACS small-area numbers may get coarser or go missing under DAO 216-26; the change maps,
  block-group maps and the reliability warnings all feel it. Worth a scenario check before the next
  5-year refresh.
- Embeds and viral traffic lean on OpenFreeMap; schedule the self-hosted basemap (S4) with embeds.
- License checks: LTDB terms unknown (ask Brown); NHGIS is out (no redistribution).

**Overlaps with other agents:** insight machine (data-at-scale), exhibit generator and grant
packs (planner workflows), embeds (familiarity / competitors), talking summaries (visitor AI, but
this version is deterministic, no AI).

**Sensitive wording to route to Robbie:** the federal data record (federal policy), fifty years
of a neighborhood (race, redlining, displacement), any classroom lesson on race or income.

**Questions for the lead**
1. Does the federal data record fit Mapwich's neutral, educational voice, or should it live only
   as Specials? (Robbie's call: sensitive.)
2. Is the 2021–2025 ACS 5-year release (date unknown) the right anchor for the next phase, or
   should the phase not depend on a federal date?
3. Grant map packs as the first Fork: worth asking Robbie now, or wait until March 2027?
