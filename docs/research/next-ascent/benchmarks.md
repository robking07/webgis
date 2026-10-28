# Benchmarks: the sites planners already use (research R3)

Status: sections 1–2 done (2026-10-27).
Next: section 3, features worth copying.

Research notes for the next-phase plan. Not for merge; the lead harvests it.
Sizes: S ≈ 100k tokens, M ≈ 275k, L ≈ 500k, XL = several L.

**How this was checked.** Web searches and page fetches on 2026-10-27, plus prior repo notes
(D-04 EJScreen, D-35 Census Reporter links, D-395 benchmarks, `.claude/agents/review-lead.md`).
Prices marked *(3rd party)* come from review sites or agency documents, not the vendor. Points
marked *(not re-checked)* are from general knowledge of the tool and were not confirmed on a live
page today (several sites block fetches or render only with JavaScript). Phone notes are from
reputation and design, not from hands-on phone testing; the lead should have the tester walk the
top three on a real phone before quoting them in portfolio copy.

## 1. Tool by tool

### Big news first (status changes in 2025–2026 that open room for Mapwich)

- **County Health Rankings & Roadmaps is ending in its current form.** RWJF funding ends December
  2026; there is no 2026 annual release (only a March 2026 refresh of 34 measures), no new Health
  Groups, no trend graphs; the site stays up "through December 2026". UWPHI announced new
  multi-year funding on 2026-10-20 that will "not extend CHR&R as it exists today" (county data and
  What Works for Health continue in some form).
  [blog](https://www.countyhealthrankings.org/findings-and-insights/blog/chrr-updates-data-for-34-measures-will-not-produce-a-2026-annual-data-release),
  [funding post](https://www.countyhealthrankings.org/findings-and-insights/blog/uwphi-secures-new-multi-year-funding-to-evolve-chrr-beyond-2026)
- **Esri retired ArcGIS Community Analyst on 2026-03-01** (also dropped from Hub Premium). It was
  the public-sector "community profile" product ($995–$3,995/yr per user, old list prices);
  users are pushed to Business Analyst Web, which costs far more (*3rd party*: $700–$4,200/month).
  [Esri notice](https://www.esri.com/arcgis-blog/products/community-analyst/announcements/deprecation-notice-for-arcgis-community-analyst-transition-to-arcgis-business-analyst-web-app)
- **EJScreen (EPA) and the ETC Explorer (USDOT) were taken down in early 2025**; the Sierra Club
  suit was dismissed for standing on 2026-03-13. PEDP's screening-tools.com hosts restored EJScreen,
  EJAM, CEJST 2.x, FEMA Future Risk Index, HIFLD Next; data is frozen at 2024 vintages. Social
  Explorer sells a rebuilt EJScreen. ETC Explorer has no confirmed public mirror (DVRPC still
  serves a copy of its tract layer as an ArcGIS service).
  [Harvard EELP tracker](https://eelp.law.harvard.edu/tracker/dot-launched-the-equitable-transportation-community-explorer),
  [screening-tools.com](https://screening-tools.com/)
- **CDC PLACES** is still publishing: December 2025 release, 40 measures (7 new health-related
  social needs), tracts on 2020 geography; Kentucky and Pennsylvania missing for 2023-BRFSS measures.
  No 2026 release seen yet. [CDC notes](https://www.cdc.gov/places/help/data-notes/)
- **Census Reporter** loaded 2024 ACS on 2026-02-08; it is volunteer-maintained (Joe Germuska, Ian
  Dees). Healthy but fragile.
- **Data USA** shows no dated updates on its homepage and now promotes Deloitte PeoplePrism data
  for three states. Looks coasting.

**Read for the lead:** two widely used free tools (CHR&R, Community Analyst for agencies) and two
federal screening tools (EJScreen, ETC Explorer) shrank or vanished inside 18 months. "Free,
independent, and still here next year" is itself a feature, and Mapwich already carries most of
their inputs (PLACES, SVI, NRI, CEJST, ACS, FARS).

### The tools

Format per tool: **Who uses it · Loved for · Paywall · Weak spots (phones especially).**

**PolicyMap** (policymap.com)
- Who: CDFIs, housing and community-development staff, hospital community-benefit teams, academic
  libraries, some planners.
- Loved for: one place for ~50k indicators including HMDA, HUD, health, and licensed data; 3-layer
  maps; ready reports for any custom area you draw; "Pam" chatbot for subscribers.
- Paywall: custom quotes only now. Old public prices were $200/month or $2,000/year for an
  individual (*3rd party, ~2016*). Free "Open Map" is public data with limited tools; premium data
  (home sales, school ratings, nonprofits), Community Health Report, API, uploads and embeds are
  paid. Library tiers split Standard vs Premium.
- Weak: dense desktop UI with many menus; maps feel heavy; little on phones (*not re-checked*);
  free edition hides the reports people actually want; no change-over-time maps in the free tier.

**Social Explorer** (socialexplorer.com)
- Who: academics and students (via library site licenses), journalists, some planners.
- Loved for: Census back to 1790 with consistent tables; side-by-side swipe maps; reports with
  MOEs; presentation/story mode.
- Paywall: Professional $195/month, $150 quarterly, $135 annual (*3rd party*); institutional
  $1,350–$7,200/yr by population served (*3rd party*); 7-day trial. Free tier is tiny. Also sells a
  rebuilt EJScreen.
- Weak: paywall on nearly everything useful; the old mobile app was announced for Android/iPad with
  iPhone "coming soon" (undated); desktop-first UI.

**data.census.gov**
- Who: everyone who needs the official number, margins included; the citation of record.
- Loved for: authority; every table and margin; geography by any level; downloads.
- Paywall: none.
- Weak: slow and table-first; maps are an afterthought; searching needs table IDs; poor on phones
  (*not re-checked*); no context ("is 14% high?"). Census runs quarterly usability tests, so it is
  improving slowly. The 2025 ACS changes (health insurance, education, labor force questions) will
  break year-to-year comparisons in 2026–2027 releases; Census says comparison guidance comes with
  the 1-year data.

**Data USA** (datausa.io, Deloitte + Datawheel + MIT)
- Who: students, journalists, job seekers, people Googling a city or an occupation.
- Loved for: automatic narrative profiles ("The median household income in X is…"), 47k reports,
  occupations, universities, industries in one place, good SEO.
- Paywall: none (it is a Deloitte showcase; now promotes PeoplePrism data).
- Weak: shallow for planners (no tracts, no transport depth), charts over maps, no margins, unclear
  update cadence.

**Census Reporter** (censusreporter.org)
- Who: journalists, planners who want a quick ACS answer, librarians.
- Loved for: place profiles with state and U.S. context on every row (Mapwich copied this as D-395);
  MOE flags that grey out unreliable numbers; compare places and download in CSV/GeoJSON/shapefile;
  table search by topic.
- Paywall: none (donations via Open Collective).
- Weak: ACS only; maps are basic; little change-over-time; volunteer upkeep; profiles are long on
  phones.

**County Health Rankings & Roadmaps** (countyhealthrankings.org)
- Who: public health departments, hospitals (community health needs assessments), county boards.
- Loved for: one ranked, trusted number per county; plain-language measures; "What Works for
  Health" strategies; state reports.
- Paywall: none.
- Weak: county only; now frozen and in transition (above); rankings were already softened into
  "Health Groups" in 2025.

**CDC PLACES** (cdc.gov/places)
- Who: health planners, researchers, grant writers.
- Loved for: tract-level model estimates for 40 measures; free downloads and API.
- Paywall: none.
- Weak: the interactive map is a basic ArcGIS viewer; model estimates read like measurements unless
  explained; KY/PA gaps; geography switched in 2024 and silently breaks joins.

**EJScreen-style tools** (restored EJScreen, CEJST, ETC Explorer, PEDP's screening-tools.com)
- Who: grant writers (Justice40 era), EJ advocates, MPOs doing Title VI/EJ analysis.
- Loved for: one percentile per block group/tract; "is this place disadvantaged?" as a yes/no;
  printable reports for a drawn area.
- Paywall: none (Social Explorer sells its version).
- Weak: federal versions gone; mirrors frozen in 2024; heavy ArcGIS web apps that are poor on
  phones (*not re-checked*); percentiles without the raw value confuse people.

**Opportunity Atlas** (opportunityatlas.org, Opportunity Insights + Census)
- Who: researchers, housing mobility programs, journalists, some planners.
- Loved for: tract-level adult outcomes of kids who grew up there, split by parent income, race and
  gender; a story people remember. 2025 release added credit outcomes.
- Paywall: none.
- Weak: one-time research data (cohorts born ~1978–1985), not refreshed; JavaScript-only page
  ("Loading" to a fetcher); dense filter panel on phones (*not re-checked*).

**National Equity Atlas** (PolicyLink + USC Equity Research Institute)
- Who: advocates, foundations, city equity offices.
- Loved for: race-disaggregated indicators for the 100 largest cities and regions and all states;
  "equity dividend" (GDP gain if racial gaps closed); clear charts.
- Paywall: none.
- Weak: big places only; charts more than maps; the site blocked our fetch, and recent update dates
  were hard to find (*not re-checked*).

**Esri Living Atlas / ArcGIS Hub**
- Who: every GIS shop; most state DOT, MPO, county and city open-data portals are ArcGIS Hub sites.
- Loved for: ready ACS layers (100+, 2020–2024 vintage since Feb/Mar 2026) that drop into ArcGIS;
  authoritative agency layers; Hub makes a portal in a day.
- Paywall: the layers are free to view; doing much with them needs an ArcGIS license (thousands per
  year); Community Analyst retired (above).
- Weak: Hub portals are catalogs, not answers: a list of layers, each with its own viewer; slow on
  phones; every agency's portal looks different and names fields its own way.

**Felt** (felt.com)
- Who: GIS teams and non-GIS staff who want a quick, nice, shareable map; consultants.
- Loved for: the best "make a map in a minute" UX; real-time collaboration; Felt AI.
- Paywall: Free (3 seats, 10k views/month, no uploads processing, no embeds); Team $199/month
  (annual), Business $599/month, Enterprise from $1,250/month. [pricing](https://felt.com/pricing)
- Weak: bring your own data; no curated US data library; no reliability or context on values.

**USAFacts** (usafacts.org, Ballmer-funded nonprofit)
- Who: general public, journalists, teachers.
- Loved for: plain-language explainers of government numbers; nonpartisan tone; clean charts.
- Paywall: none.
- Weak: national and state charts more than local maps; little for planners (*not re-checked*).

**Planner favorites** (found in MPO work programs and agency docs)
- **LEHD OnTheMap** (Census): commute sheds, "where do workers live," inflow/outflow. Free; 2023
  LODES released Dec 2025 (Alaska, Michigan missing). Old-fashioned UI, desktop-only in practice,
  but planners rely on it. Mapwich has LODES job density only, not flows.
- **CTPP** (AASHTO): ACS journey-to-work flow tables; free but hard to use.
- **CMAP Community Data Snapshots** (Chicago MPO): one PDF profile per county, municipality and
  Chicago community area, every July (June 2026 latest), regional totals aggregated from counties,
  MOE caveats for small places. Planners print and attach these. The pattern exists at many MPOs.
- **State DOT / MPO portals** (ArcGIS Hub): traffic counts (AADT), crash data, bridge condition,
  functional class. Each state differs; hard to compare across states.
- **Paid trip data:** StreetLight ($66k–$440k/yr per region, agency documents), Replica (regional
  subscriptions, often split with member agencies; price not published). These are the real
  money in planner data. Mapwich should never compete here; it is the clearest **Fork candidate**
  territory only if someone builds a cheaper public-data alternative (see section 3).
- **Esri Business Analyst / Community Analyst:** the "community profile report" for a drawn area
  (see retirement above).

## 2. Gap map

What each tool does well (●), partly (◐) or not at all (○), judged from section 1. Mapwich column
is today's live site (place pages, compare, change maps, reliability warnings, CSV, Specials).

| Job a planner needs done | PolicyMap | Social Expl. | data.census | Census Rep. | Data USA | CHR&R / PLACES | EJ tools | Hub / Living Atlas | Felt | **Mapwich** |
|---|---|---|---|---|---|---|---|---|---|---|
| Answer "what's the number here?" in under 30 s on a phone | ○ | ○ | ○ | ◐ | ◐ | ◐ | ○ | ○ | ◐ | **●** |
| Is it high or low? (state, U.S., peers) | ◐ | ◐ | ○ | ● | ◐ | ● | ● (percentiles) | ○ | ○ | ◐ (state + U.S., D-395; no peers yet) |
| Is it reliable? (margins shown, warned) | ◐ | ● | ● (raw MOE) | ● | ○ | ◐ | ○ | ◐ | ○ | **●** (warnings on the map) |
| How has it changed? (maps, not tables) | ◐ paid | ● paid | ○ | ○ | ◐ charts | ◐ (trends now frozen) | ○ | ○ | ○ | **●** (From → To) |
| Compare two places side by side | ◐ | ◐ | ◐ | ● | ◐ | ● | ○ | ○ | ○ | **●** |
| Totals for my own area (MPO, corridor, drawn) | ● paid | ◐ paid | ◐ (pick tracts) | ○ | ○ | ○ | ● (drawn area) | ◐ (needs ArcGIS) | ◐ | ○ (#292 parked) |
| Commute flows (where workers live/work) | ◐ | ○ | ◐ (tables) | ○ | ○ | ○ | ○ | ○ | ○ | ○ (job density only) |
| Transportation network data across states (AADT, crashes, bridges) | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ (one state at a time) | ○ | ◐ (AADT, FARS, NBI) |
| Health + social + environment + transport in one map | ● paid | ◐ | ○ | ○ | ◐ | ◐ health only | ◐ env only | ◐ scattered | ○ | **●** (138 maps) |
| A one-page summary I can paste into a staff report | ● paid | ● paid | ○ | ◐ | ◐ | ● | ● | ○ | ◐ | ○ |
| Plain-language story about what the data means | ○ | ◐ blog | ○ | ○ | ◐ auto text | ◐ | ○ | ◐ StoryMaps | ○ | **●** (Specials) |
| Survives federal takedowns / funding ends | ◐ | ◐ | n/a | ◐ volunteers | ◐ | ○ (CHR&R ending) | ○ (removed) | ◐ | ● | ◐ (CEJST/NRI/SVI kept; ends depend on Robbie) |
| Free, with no account | ◐ | ○ | ● | ● | ● | ● | ● | ◐ | ◐ | **●** |

### Gaps nobody fills well (where Mapwich could own the ground)

1. **The phone answer.** No benchmark answers a quick place question well on a phone. Census
   Reporter is the closest and is long-scroll tables. Mapwich already leads; the gap to own is
   "stand in a meeting, tap where you are, get the number with its context and reliability."
2. **Change over time, free and on a map.** Only paid tools (Social Explorer, PolicyMap) map change;
   CHR&R just lost its trend graphs. Mapwich's From → To maps are unusual for a free tool.
3. **Your-area totals without a license.** The "draw an area, get a report" job was what Community
   Analyst (retired March 2026), PolicyMap (paid) and EJScreen (removed) did. Planners still need it
   for MPO areas, corridors, study areas and grant applications. Nobody free does it with honest
   margins.
4. **Cross-state transportation basics.** State DOT portals each publish AADT, crashes and bridges
   their own way; nobody puts them on one national map with one legend. Mapwich already has AADT,
   FARS and NBI; "same map in every state" is planner-native and nobody else bothers.
5. **Continuity for orphaned data.** CHR&R measures (frozen after 2026), EJScreen and ETC Explorer
   indicators (removed), CEJST (PEDP-only). A neutral, labeled home for the public inputs (not the
   federal indices' branding or judgments) is open, and fits "Library maps."
6. **Saying what a number means.** Data USA's auto-sentences and USAFacts' explainers show demand;
   no one does it with margins and planner context. Specials do it for a few topics; nothing does it
   for every place.
7. **The 2025 ACS question changes.** Health insurance, education and labor-force questions changed
   in the 2025 ACS. Every tool will show misleading "changes" across the break in 2026–2027.
   Mapwich's reliability warnings are the natural place to flag it first.

## 3. Features worth copying

## 4. Where Mapwich is already ahead

## 5. Top 10
