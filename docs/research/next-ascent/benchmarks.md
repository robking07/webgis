# Benchmarks: the sites planners already use (research R3)

Status: done (2026-10-27).
Next: none; optional follow-up is hands-on phone checks of the top three benchmarks (tester).

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

Each card: **What a visitor sees/does · Why it serves Robbie's weekly use · Size and tokens ·
Monthly cost · Fork candidate? · Builds on.** Sizes assume today's foundation (place pages,
`lib/benchmarks.ts`, compare, change maps, CSV, R2 static files, registry + ingest). Running costs
assume static files on R2/Vercel free tiers unless stated.

### C1. Place snapshot: a one-page printable profile (copy: CMAP Community Data Snapshots, Census Reporter, Community Analyst)
- **Sees/does:** on any place page, "Snapshot" gives a clean one-page (letter-size) summary: 12–20
  headline numbers grouped by topic, each with state + U.S. benchmark and a reliability mark, a
  small locator map, source line and date. Prints or saves as PDF from the browser. Same page on a
  phone is a tidy card stack.
- **Robbie:** the thing he'd paste into an email or staff report after a quick lookup; replaces a
  CMAP-style PDF for any place in the U.S., not just one region.
- **Size:** M (~200–275k): curated topic list (registry field or one config), print CSS, locator map
  as a static image or small MapLibre canvas. No server.
- **Cost:** $0.
- **Fork candidate:** no for places; yes for the custom-area version (C2).
- **Builds on:** `/place/[geoid]`, D-395 benchmarks, CSV download, link previews (OG image code
  can render the locator).

### C2. Your-area totals: MPO, county group, corridor buffer, or drawn shape (copy: PolicyMap custom regions, EJScreen drawn-area report, Community Analyst)
- **Sees/does:** pick an MPO or a set of counties, or draw a shape / buffer a road, and get totals
  and rates for the area with margins of error computed the Census way (sum counts, root-sum-square
  MOEs; rates from summed numerators/denominators), plus the snapshot (C1) for that area.
- **Robbie:** the most planner-native job in this list (study areas, grant applications, Title VI
  areas). It is issue #292 plus a drawing tool.
- **Size:** L (~500k) for MPO/county-group + buffer; drawn polygons with tract/BG apportionment add
  ~M. Area weighting is a known trap (see the `postgis-analysis` skill); start with whole
  tracts by centroid and say so.
- **Cost:** $0 if done in the browser from tract files already on R2; a server path would be
  Supabase free tier.
- **Fork candidate:** **yes.** Study-area reports with branded PDF output, saved areas and bulk
  export are what consultants paid Esri for. Keep the free core on Mapwich (MPO and county totals);
  the paid fork would be saved projects, branding, batch reports.
- **Builds on:** #292, tract/BG files on R2, compare's count/share math (part 2b).

### C3. Auto-sentences with reliability built in (copy: Data USA narratives, USAFacts tone)
- **Sees/does:** at the top of each place page and in the details panel, two or three plain
  sentences: "Hennepin County's poverty rate (11.2%) is higher than Minnesota's (9.6%) and fell 1.4
  points since 2018. The change is reliable." Sentences use the data's own margins to choose words
  ("about the same as", "clearly higher").
- **Robbie:** faster to read than a table; reusable in Specials drafts; strong portfolio moment.
- **Size:** S–M (~150k): templates, no AI; rules reuse 1.3 reliability tests and change-map math.
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** reliability warnings (1.3), change maps (1.2), benchmarks (D-395), "Why this
  matters" #115.

### C4. Peers: "places most like this one" (copy: CHR&R peer counties, Census Reporter context)
- **Sees/does:** a place page lists 5 similar places (size, density, income, region); benchmarks
  gain a "peers" value; one tap compares.
- **Robbie:** planners always ask "compared with places like us"; feeds compare.
- **Size:** M (~200k); precomputed nearest neighbours per level into static JSON.
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** #291 (Robbie said build), compare, benchmarks.

### C5. Swipe and two-map views (copy: Social Explorer side-by-side swipe)
- **Sees/does:** split the map: left 2015, right 2023 (or two datasets), drag the divider; phones
  get a tap-to-flip toggle instead of a swipe.
- **Robbie:** good for meetings and Specials; Social Explorer charges ~$135–195/month for this.
- **Size:** M (~250k): second MapLibre instance with synced camera (or `maplibre-gl-compare`),
  URL state, phone toggle.
- **Cost:** $0 (more tile reads, still free on R2).
- **Fork candidate:** no.
- **Builds on:** change maps, year slider, Combinations.

### C6. Commute flows, OnTheMap-lite (copy: LEHD OnTheMap)
- **Sees/does:** tap a county or tract, see where its workers live (or where residents work) as
  lines/shaded places, with top-10 list; inflow/outflow/stay counts.
- **Robbie:** a weekly planner question; OnTheMap is desktop-only and dated.
- **Size:** L (~500k); roadmap 2.5 already. LODES OD is large; tract-to-tract nationally must be
  pre-aggregated and sharded (county-to-county first, tracts within a metro later).
- **Cost:** storage on R2 a few GB at most, within free tier (10 GB) if county-level first;
  tract-level national may push past it (~$0.015/GB-month after 10 GB, still pennies).
- **Fork candidate:** no (LODES is public; the paid analogue is StreetLight/Replica, which is a
  different data class).
- **Builds on:** LODES ingest (job density), place pages.

### C7. One national map of state DOT basics (copy: nobody; state Hub portals do it one state at a time)
- **Sees/does:** AADT, crash/fatality, bridge condition and pavement (HPMS) on one national legend;
  click a segment to see source state, year, and a link to the state's own portal.
- **Robbie:** squarely his job; a portfolio piece other planners will recognize instantly.
- **Size:** L–XL. AADT/FARS/NBI exist; adding HPMS pavement and harmonizing per-state crash files
  is the XL part. Start: HPMS national sections (one federal file) at M.
- **Cost:** R2 storage for line tiles, likely within free tier for one vintage.
- **Fork candidate:** no.
- **Builds on:** `aadt` features layer, NBI, FARS, VMT (HPMS) ingest.

### C8. Orphaned-data shelf: CHR&R, EJScreen, ETC Explorer inputs as Library maps
- **Sees/does:** a "Kept public" shelf (Library tier) carrying the raw public inputs these tools
  used, each with a provenance note: "from CHR&R March 2026 refresh; CHR&R stopped annual releases".
  Not the indices' scores or "disadvantaged" labels unless Robbie decides (D-04 precedent).
- **Robbie:** preserves things planners cited in grants and plans; strong story.
- **Size:** M per source family (~250k): CHR&R measures (most come from public federal sources,
  which Mapwich can ingest directly; CHR&R's own terms say "All rights reserved", license not
  confirmed: **license check needed**), ETC Explorer inputs (mostly ACS, CDC, EPA, FEMA; many
  already in Mapwich).
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** registry + ingest, D-04 archive pattern, Library tier.
- **Flag for Robbie:** EJ/"disadvantaged" wording and recreating federal indices are sensitive
  language and high-stakes data judgment.

### C9. Embeds and "cite this" (copy: PolicyMap Embed & Share and Felt embeds, both paid)
- **Sees/does:** "Embed" gives an iframe snippet of the current map view (legend + credits, no
  chrome); "Cite" gives a one-line citation with dataset vintage and URL.
- **Robbie:** drop live maps into staff reports, StoryMaps, Specials; spreads Mapwich.
- **Size:** S (~100k): an `?embed=1` chrome-off mode and a copy box.
- **Cost:** bandwidth; R2 egress is free; Vercel free tier is fine at hobby traffic. Watch Vercel
  function use if embeds run server code (they shouldn't).
- **Fork candidate:** no (white-label embeds for agencies could be one later).
- **Builds on:** share button, link previews, map URL state.

### C10. "Near me" one-tap lookup (copy: nobody does it well)
- **Sees/does:** a locate button: the map zooms to your tract and shows its card with the current
  dataset value and benchmarks.
- **Robbie:** field visits and meetings; pure phone advantage.
- **Size:** S (~75–100k): browser geolocation, point-in-polygon from loaded tiles.
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** details panel, D-395.

### C11. Data-break warnings (the 2025 ACS question changes)
- **Sees/does:** change maps and timelines show "the question changed in 2025; this change may not
  be real" on the affected datasets (health insurance, education, labor force), using Census's own
  guidance.
- **Robbie:** protects him from quoting a fake trend; shows careful data practice.
- **Size:** S (~60–100k): a registry field (`breaks: [{year, note}]`) read by the existing
  reliability warning UI.
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** 1.3 reliability warnings, change maps, registry.

### C12. Release watch: "new on Mapwich" and "what changed" (copy: CHR&R's state reports, Census release calendars)
- **Sees/does:** a short dated list: "2024 ACS loaded; 412 counties' poverty rates changed
  reliably; biggest moves". Optional RSS.
- **Robbie:** a weekly reason to open the site; seeds Specials ideas.
- **Size:** S–M (~150k): script compares old and new values, writes a static page.
- **Cost:** $0.
- **Fork candidate:** no.
- **Builds on:** data-scout release watch, change-map math, Combinations checks.

### Not worth copying
- PolicyMap's 50k-indicator menu tree and Social Explorer's table catalog (opposite of map-first).
- Rankings ("#1 healthiest county"): CHR&R moved away from them for good reasons.
- Accounts, uploads and collaboration (Felt): high cost, off-mission; roadmap already says no.
- Licensed private data (home sales, school ratings): money and license risk.
- AI chatbots like PolicyMap's Pam and Felt AI: covered by the visitor-AI research agent; note
  that both rivals gate them behind paid plans.

## 4. Where Mapwich is already ahead

| Strength | Who it beats | Evidence today |
|---|---|---|
| Map first, fast, chrome falls away | data.census.gov, PolicyMap, Hub portals | D-25/D-26 map-first rules; static files on R2 (S2) |
| Works on a phone | every benchmark (none is phone-first) | phone drawer, phone tap fixes (#341), useIsPhone work |
| Change maps, From → To, free | Social Explorer and PolicyMap charge for this | 1.2 + year slider (#167) |
| Reliability warnings on the map itself | Census Reporter does it only in tables; others not at all | 1.3 |
| Health + environment + transport + people in one viewer, free | PolicyMap (paid), CHR&R/PLACES (health only), EJ tools (env only) | 138 datasets across 6 categories |
| Keeps data others dropped | EJScreen/ETC removed, CHR&R freezing | CEJST, NRI, SVI, PLACES live on Mapwich |
| Editorial Specials checked against the numbers | Data USA auto-text, USAFacts explainers (no maps), nobody local | 1.8 pipeline, `check:special`, 4 Specials live |
| Combinations that pass automatic checks | nobody | D-447 |
| Open source, process in public (token budgets, decisions) | every benchmark is closed or opaque | MIT repo, `docs/decisions/`, disclosures plan |

### How to show it off (portfolio)

Each is cheap; pick two or three.

1. **"Thirty-second answer" side by side (S, ~75k).** Same question on a phone ("share of
   households with no car in this tract, and is it reliable?"): screen recordings of Mapwich vs
   data.census.gov vs Census Reporter, with tap count and seconds. Real screenshots at true scale
   (mockup standard). A short page or a section of About. Respectful tone: name the tools, praise
   what they do well. **Flag:** naming other products is public wording; the lead may want Robbie's
   eye.
2. **"Free here, paid there" table (S, ~30k).** Change maps, compare, CSV, swipe (if C5), area
   totals (if C2): what each costs at Social Explorer/PolicyMap/Felt (prices from section 1, dated
   and sourced). Fits the disclosures/About work; on hold with disclosures copy (Robbie).
3. **"Still here" note on kept datasets (S, ~40k).** On CEJST, NRI, SVI and any C8 maps: a one-line
   provenance badge ("EPA removed EJScreen in 2025; this copy is from …"). Shows care with data,
   and it is useful.
4. **Lighthouse and speed numbers on the About page (S).** Mobile performance and accessibility
   scores beside the same scores for two benchmarks, measured on the same day. Re-run quarterly.
5. **Case study write-up (Robbie's voice, editor drafts).** "How a planner built a national data
   viewer with AI agents for $X and N tokens": the budget table in `docs/progress.md` is the
   evidence. No benchmark can tell this story.

## 5. Top 10

Ranked for Robbie's weekly use first (tie-break rule), then gap size, then cost.

| # | Idea | Size / tokens | Monthly cost | Fork? | Builds on |
|---|---|---|---|---|---|
| 1 | **Your-area totals** (MPO, county group, corridor buffer; drawn shapes later) with Census-style margins (C2) | L ~500k | $0 | **Yes**: saved study areas, branded batch reports | #292, compare math, tract files on R2 |
| 2 | **Place snapshot**: one-page printable profile for any place, then any area (C1) | M ~250k | $0 | No (area version rides on #1's fork) | place pages, D-395 |
| 3 | **Auto-sentences** with reliability-aware wording on place pages and the details panel (C3) | S–M ~150k | $0 | No | 1.3, 1.2, D-395, #115 |
| 4 | **Commute flows**, OnTheMap-lite, county-to-county first (C6) | L ~500k | ~$0 (R2 free tier) | No | LODES ingest, roadmap 2.5 |
| 5 | **Peers**: "places most like this one" plus a peer benchmark (C4) | M ~200k | $0 | No | #291, compare |
| 6 | **Data-break warnings** for the 2025 ACS question changes (C11) | S ~75k | $0 | No | 1.3, registry |
| 7 | **One national map of state DOT basics**, starting with HPMS sections (C7) | M to start; XL for crashes by state | $0–$1 | No | aadt, NBI, FARS, VMT |
| 8 | **Orphaned-data shelf** in the Library tier: CHR&R and ETC/EJScreen public inputs with provenance (C8) | M ~250k per family | $0 | No | registry, D-04 pattern; **license + sensitive wording to Robbie** |
| 9 | **Embed + cite** (C9) | S ~100k | $0 | No | share, link previews |
| 10 | **Show-off pack**: 30-second answer comparison, "still here" badges, speed scores (section 4, items 1, 3, 4) | S ~150k total | $0 | No | About page, Specials |

Near misses: swipe view (C5, M), "near me" (C10, S; cheap and could slot into #187 map polish),
release watch (C12, S–M).

**Rough total for the top 10 as a phase:** ~2.4–2.6M tokens (two L, four M, four S), well beyond
one phase at Robbie's 2–4 hours/week. A plausible next phase: #6, #3, #2, #9 (≈ 575k) plus #1
scoped to MPO and county-group totals (≈ 350k).

## Questions for the lead

1. C2's paid fork (saved study areas, branded reports): worth noting in the Vision as a Fork
   candidate, or out of scope until Mapwich has users?
2. C8: is recreating EJ/ETC inputs (not their labels) inside the D-04 precedent, or a new Robbie
   decision? CHR&R's terms say "All rights reserved"; ingest from the underlying federal sources
   instead?
3. Section 4 item 1 names other products on a public page. Robbie's call on tone?

## Sources

PolicyMap pricing page (custom quotes) · Social Explorer prices via Capterra/G2 listings · Felt
pricing page · CHR&R blog posts (2026 refresh, funding) · Esri Community Analyst deprecation notice ·
Harvard EELP Federal EJ tracker (EJScreen, ETC Explorer) · screening-tools.com (PEDP) · CDC PLACES
data notes · Census Reporter homepage · Data USA homepage · Census LEHD release notes (Dec 2025) ·
Esri ACS Living Atlas blog (Feb 2026) · CMAP Community Data Snapshots PDFs · StreetLight costs from
C/CAG MOUs and Des Moines MPO deck · Opportunity Atlas data tables (Census, July 2025).
