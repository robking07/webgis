# Research notes: how planners work, and the MPO rabbit hole (R5)

Status: section 1 done (2026-10-27).
Next: section 2, "in a conversation" moments.

Not for merge. The lead harvests these notes for the Vision and the Next phase.

## 1. Planner jobs to be done

### Policy weather (checked 2026-10-27; this changes fast)

| Fact | Status | Source (date) |
|---|---|---|
| Federal surface transportation law (IIJA) | Expired 2026-09-30; extended to **2026-12-11** (H.R. 6500). House long-term bill (BUILD America 250 Act, H.R. 8870) reported in May 2026, stalled since | CRS IG10101 (2026-09-14); Holland & Knight (2026-07-27) |
| SS4A safety grants | FY26 NOFO 2026-03-27, closed 2026-05-26, up to $993M; FY26 is the last IIJA year. Planning grants still score "share of population in an underserved census tract"; DOT also uses fatalities and fatalities per 100k from national data. New FY26 priority: post-crash care / emergency response | DOT SS4A page; HDR NOFO summary (2026-03-27) |
| BUILD (was RAISE) | FY26 NOFO Dec 2025, due 2026-02-24, $1.5B, single round. Merit criteria reweighted to safety, quality of life, mobility and community connectivity, economic competitiveness; ratings ask whether benefits are "clear, direct, and data driven" | DOT FY26 BUILD NOFO; CSAC (2025-12) |
| Justice40, CEJST | Rescinded Jan 2025; CEJST taken off line; lawsuit dismissed March 2026 | Harvard EELP tracker |
| EPA EJScreen; USDOT ETC Explorer | Both removed (EJScreen 2025-02-05; ETC Explorer late Jan 2025). Mirrors exist for EJScreen (screening-tools.com, Yale, Social Explorer) | SEJ; Harvard EELP |
| Title VI | DOT final rule 2026-06-11 (FR Doc 2026-11790, 91 FR 35424) removes disparate-impact language from 49 CFR 21; Title VI now enforced for intentional discrimination only. FTA Circular 4702.1B (2012) still on the books, so MPOs and transit agencies are in limbo until FTA updates it | AAAE alert (2026-06-11); Planetizen (2026-06); AMPO National Beat (2026-06-18) |
| Planning emphasis areas | FHWA told MPOs in 2025 to stop spending PL funds on climate, EV and environmental-justice tasks and drop those PEAs from UPWPs (seen in Huntsville MPO board resolution, May 2025; Kansas DOT memo, April 2025) | Huntsville MPO resolutions (2025-05) |

**What this means for Mapwich.** The federal screening tools planners used for "is this an
underserved area?" (CEJST, EJScreen, ETC Explorer) are gone from federal sites, but SS4A planning
grants still ask for the share of people in underserved tracts, and Title VI and environmental-justice
work continues locally under state law, MPO policy and FTA's unchanged circular. Mapwich already
carries CEJST (archived, labeled) and CDC SVI. A stable, plainly labeled, free place to see those
layers, with the vintage and status stated honestly, is useful *right now*. Flag for Robbie: the
wording around "disadvantaged", "equity" and the federal rollback is sensitive and politically
charged; any copy on this goes to him.

### Jobs, by who does them

Each row: the recurring task · the data pulled · where it comes from today · the pain.

**MPO staff (Robbie's own seat)**

| Task | Data pulled | Where from today | Pain |
|---|---|---|---|
| **Long-range plan (MTP/LRTP), every 4–5 years** | Population, jobs, households now and forecast; commute mode, travel time; zero-car households; crashes; pavement and bridge condition; transit service; peer-region benchmarks | ACS via data.census.gov or Census Reporter; LEHD OnTheMap; state DOT crash database; HPMS; NBI; NTD; the MPO's travel model; consultant work | Assembled once per plan in spreadsheets; peer comparisons rebuilt by hand; "how do we compare to similar regions?" answered ad hoc |
| **TIP development and amendments (yearly, monthly amendments)** | Project list, cost, fund source; project location vs demographics, crash history, jobs nearby | MPO's own database or eTIP software (EcoInteractive, etc.), state STIP | TIP maps live in separate tools; the public can't see "what's planned near me" in context with the data |
| **Regional competitive solicitation / project scoring** (Met Council Regional Solicitation, CMAP call for projects, DVRPC TCDI, ARC LCI) | Per-project: population and jobs within ½ mile, zero-car households, poverty, people of color, crash history, transit access | GIS buffers on ACS block groups; applicants each re-derive the same numbers | Every applicant city recomputes the same buffer stats; scoring tables are PDFs |
| **UPWP (yearly)** | Little data; it's a budget and task list | Staff | Hard for outsiders to find what studies are funded; useful as a "what's this MPO working on?" index |
| **Federal performance targets (PM1 safety yearly; PM2/PM3 pavement, bridge, reliability)** | Fatalities, serious injuries, rates per VMT; pavement and bridge condition; travel-time reliability | FARS + state crash data; HPMS; NBI; NPMRDS (via RITIS / state) | Five-year rolling averages computed in Excel; peers rarely compared |
| **Title VI / environmental-justice analysis** (plan and TIP "benefits and burdens", transit service changes) | Minority and low-income share by tract/block group vs region; limited English | ACS; FTA circular methods | Repeated for every plan and service change; methods now in federal limbo (see above) |
| **Board and committee memos** | One or two headline numbers per agenda item, a locator map | Copy-paste from earlier reports | Needs a quick, citable number and a clean map image, today |

**City and county planners**

| Task | Data pulled | Where from today | Pain |
|---|---|---|---|
| Comprehensive plan update (in MN, every 10 years for Met Council region) | Same demographic base as the MPO, but for *their* city; housing cost burden, age, commute | Met Council community profiles, ACS, consultants | City-level (place) numbers with MOE; Mapwich today shows counties/tracts, not cities (#332) |
| **Safety Action Plan (SS4A)** | Fatal and serious injury crashes 5 years; high-injury network; crash rates; underserved tracts; demographics of crash victims | FARS, state crash portal (e.g. MnCMAT2 in MN), consultant | FARS is fatal only; serious-injury data is state by state; underserved definition shifted |
| Capital improvement program (CIP) | Project list and cost; location context | City finance and engineering | Not mapped publicly in most small cities |
| Grant applications (state and federal: SS4A, BUILD, TA set-aside, Safe Routes, state programs) | Population, poverty, zero-car share, crash numbers, jobs, "peer" stats, a location map | ACS, FARS, OnTheMap, screenshots from Google Maps | The same 10 numbers hunted down for each application; the map is a screenshot |
| Corridor and station-area study | Who lives and works within ½ mile: population, jobs, income, car ownership, commute | ACS block groups, LEHD, GTFS | Buffer analysis needs desktop GIS |
| Public meeting prep | Printable map boards, a few big facts, translations | Staff GIS, Canva | Making a clean map board takes hours |

**State DOT staff**: statewide and district plans, STIP, safety plan (SHSP), freight plan, rural
transit coordination, performance targets. Same sources as MPOs, statewide. Pain: comparing
districts and MPOs to each other and to other states.

**Consultants**: write most plans and grant applications above. They have ArcGIS and paid tools
(Replica, StreetLight, PolicyMap, Social Explorer). Pain: the first-week "existing conditions"
chapter is rebuilt every job; they'd use a free, citable source for the base numbers. They are
Mapwich's most likely heavy users after planners themselves.

**Advocates and engaged residents**: testify at board meetings, comment on plans and TIPs, push
for safety projects. Pain: plans are 300-page PDFs; they can't tell what's planned near them or how
their area compares. They need a plain-language number with a source they can quote.

### The recurring core: the "ten numbers"

Across grant forms, existing-conditions chapters and memos, the same handful of facts repeat for a
city, county, corridor or MPO: population and growth; jobs; median household income; poverty /
≤200% of poverty (Robbie's low-income line); people of color; zero-car households; commute mode and
time; disability and age 65+; limited English; traffic deaths (and rate per 100k). Mapwich already
has nearly all of these at county and tract level. What's missing is the **area** the planner works
in (their city, their corridor, their MPO as one number) and a **clean way to carry the numbers out**
(citation, CSV, a map image).
## 2. "In a conversation" moments
## 3. The MPO rabbit-hole flow
## 4. Outputs planners need
## 5. Top 10
## Sources
