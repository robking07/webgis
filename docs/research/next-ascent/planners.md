# Research notes: how planners work, and the MPO rabbit hole (R5)

Status: complete (2026-10-27). All five sections and sources written.
Next: nothing; the lead harvests. Possible follow-ups listed in the PR report.

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

Robbie's use case is the meeting, the hallway, the phone call: someone says a place and a claim,
and he wants the number before the conversation moves on. Typical prompts, written as they'd be
said out loud:

1. "How many people live in the Mankato MPO?" → one total for an MPO (needs #292).
2. "Is Brooklyn Park poorer than Brooklyn Center?" → two **cities** side by side (needs #332).
3. "What share of households in this corridor don't have a car?" → a drawn or picked area (later).
4. "Has transit commuting in Ramsey County come back since 2019?" → change over time (shipped).
5. "How many traffic deaths in Hennepin County last year, and is that high?" → value + benchmark
   (state, US, peers) (partly shipped; benchmarks and peers #291).
6. "Which counties are like ours?" → similar places (#291).
7. "What's the MPO planning on this road?" → TIP projects near here (the rabbit hole, section 3).
8. "Where's their long-range plan?" → the MPO's documents in one tap (section 3).
9. "Can you send me that?" → a link that opens the same view, with a preview card (shipped).
10. "Can I put that in my memo?" → a citation line and a clean image (section 4).

### What makes a lookup fast on a phone

- **Search is the front door.** Type a city, county, MPO, ZIP or address and land on it. Typing
  "Mank" should offer "Mankato (city)", "Blue Earth County", "Mankato/North Mankato APO (MPO)".
- **One tap from place to the ten numbers.** A place card that opens with the "ten numbers"
  (section 1) already filled, each with its benchmark, before any dataset is chosen. Today the
  visitor picks a dataset first, then a place; in a meeting the place comes first.
- **Big number, one line of context, source.** "28.4% · higher than 81% of MN counties · ACS
  2020–2024." Not a table.
- **Thumb-reach controls** and no hover dependence (hover-only facts are invisible on a phone).
- **Under 2 seconds** from tap to number on a mid-range phone on LTE. Precomputed summaries per
  place beat live queries.
- **Works offline-ish**: once a place has loaded, going back to it shouldn't refetch (service worker
  cache of the per-place summary file). Meeting rooms have bad signal.

### What makes it trustworthy

- **Say what the number is**: the exact geography (city limits vs metro vs MPO), the period (ACS
  5-year 2020–2024 is a five-year average, not "2024"), and the margin of error when it's wide.
  Reliability warnings shipped; keep them visible on the place card.
- **Name the source by its agency** and link to it ("U.S. Census Bureau, ACS table B08201").
  Planners trust Census and USDOT names, not "Mapwich".
- **Never borrow a number** from a different geography (a city must not show its county's value;
  #332 already says this).
- **Show the date the data was pulled** and the vintage, and say when a newer one exists.
- **Peer and benchmark context** (state, US, similar places) so the number isn't naked.
- **Archived federal data says so**: CEJST and similar layers carry an "archived, no longer
  maintained by the federal government" label (already done for CEJST; keep it as a rule).
## 3. The MPO rabbit-hole flow

Robbie (2026-10-03): "I work for an MPO, so this is crucial." Goal: a click on the map leads to the
data, then into the plans. This section surveys where the plans live, drafts the flow in words,
then describes how the links get found and kept fresh with little of Robbie's time.

### 3a. Survey: where 11 MPOs keep their core documents (checked 2026-10-27)

Sizes run from the largest (Chicago, Philadelphia, Dallas–Fort Worth) to small (Mankato, St. Cloud,
Cheyenne, Flint Hills KS). Every one publishes all four core documents on its own site; the
difference is how findable and how stable the links are.

| MPO | Size | Platform | LRTP | TIP | UPWP | Competitive grants | Notes |
|---|---|---|---|---|---|---|---|
| Met Council (Twin Cities) | large | ASP.NET (Kentico-style `.aspx`) | Transportation Policy Plan page + imagine2050.metrocouncil.org | `/TIP.aspx` and a second long URL | `…/Unified-Planning-Work-Program.aspx` | Regional Solicitation page | `-NEW` and `(1)` URLs seen in nav already redirect to clean ones; no sitemap.xml (404). **TIP project GIS on MN Geospatial Commons, public domain** |
| CMAP (Chicago) | large | WordPress | `/regional-plan/…` (2026 RTP adopted, replaces ON TO 2050) | `/funding-assistance/transportation-improvement-program/` | only a committee page found | CMAQ, STP, TAP, CRP, Call for Projects pages | Old `www.cmap.illinois.gov/programs/tip` now redirects to an unrelated **2016 PDF** (a "soft 404": status 200, wrong content) |
| DVRPC (Philadelphia) | large | custom | `/our-work/long-range-plan` | `/our-work/transportation-improvement-program`, separate NJ and PA TIPs | FY2027 at `/about-us/work-program/fy2027`, FY2026 at a *different* path pattern | TCDI, CMAQ, TA set-aside (per state), trails, Complete Streets | **TIP GIS lines/points on catalog.dvrpc.org** |
| NCTCOG (Dallas–Fort Worth) | large | custom (`/getmedia/` GUID assets) | `/trans/plan/mtp` | `/trans/funds/tip` | `/trans/study/unified-planning-work-program` | `/trans/funds/cfps` | clean, stable paths |
| SANDAG (San Diego) | large | Sitecore | `/planning/regional-plan-landing/current-plan` | `/funding/…/regional-transportation-improvement-program` | "Overall Work Program", under budget pages | `/funding/grant-programs/…` | California names differ (RTIP, OWP) |
| ARC (Atlanta) | large | WordPress, PDFs on `cdn.atlantaregional.org` | MTP / Mobility 2055 | TIP page + amendments | UPWP page | TIP solicitations, LCI | old `/transportation-mobility/…` paths return 403 to scripts |
| Fargo–Moorhead Metro COG | mid | custom | — | `/TIP` (redirects, works) | — | — | listed on MnDOT's index |
| Duluth–Superior MIC | small | WordPress | — | TIP page now redirects to a category listing | — | — | listed on MnDOT's index |
| MAPO (Mankato) | small | WordPress.com | via "Planning documents" hub | `/tip/` (2027–2030) | via hub | none | ADA plan hosted on a consultant's domain |
| St. Cloud APO | small | WordPress | `/current-plans/current-mtp/` | `/current-plans/current-tip/` | `/current-plans/current-upwp/` | grant page under TIP | **the ideal pattern**: stable "current-" URLs |
| Cheyenne MPO (WY) | small | WordPress (Divi) | Connect 2050 | TIP page | "Work Program" page | none | |
| Flint Hills MPO (KS) | small | **Wix** | `/connect2050` | `/tip` | `/upwp` | none | PDFs on opaque `_files/ugd/<hash>.pdf` URLs |

Also checked: the **state DOT index** pattern. MnDOT's MPO pages list all 8 Minnesota MPOs' TIPs
(and have sibling pages for UPWP and MTP). One of the 8 links is already dead (Grand Forks–East
Grand Forks, a CivicPlus `portalId` URL → 404) and one points at a "2020 TIP" page that now
redirects to a general plans page (Rochester). Even the state's own index rots.

**Link check of 40 collected URLs (curl, honest user agent, 2026-10-27):**
- Landing pages ("the TIP page"): all live; several had silently moved (redirect).
- Direct PDF links (UPWPs found in search results, 13 of them): 2 dead (404), 1 timed out, 1
  blocked to scripts (403). Roughly **1 in 5 PDF links from the last 1–3 years are already broken**.
- 3 sites answered 403 to a script but work in a browser. A link checker must treat 403 as "can't
  verify", not "dead". (The repo's guardrail forbids posing as a browser; that's right.)
- 1 soft 404 (CMAP): a redirect that lands on the wrong document with a 200 status. A checker that
  only reads status codes misses this.
- Sitemaps: 5 of 6 sampled sites publish `sitemap.xml` (WordPress, Wix, DVRPC, CMAP); Met Council
  doesn't.
- The Wayback Machine already holds recent snapshots of these pages (e.g. Met Council TIP page,
  2026-04-29), so a dead link can fall back to an archived copy for free.

**Lessons for the design:**
1. **Link to the landing page, not the PDF.** Landing pages survive yearly document turnover; PDFs
   don't. Store the PDF too, as a secondary link, with its Wayback copy.
2. **No national list of MPO websites exists** in the federal MPO boundary file (NTAD fields are
   just ID, name, state, area). Seeds: state DOT MPO index pages, Wikidata "official website",
   web search on the MPO name. One-time.
3. **Names vary**: LRTP = MTP = RTP = Regional Plan = Transportation Policy Plan = "Connect 2050" /
   "Mobility 2050"; UPWP = OWP = Work Program; TIP = RTIP = TIP/STIP. The finder needs a synonym list.
4. **Spatial TIP data exists for some big MPOs** (Met Council, DVRPC, El Paso, MORPC, New Orleans
   RPC, Madison per their portals). Those can become ordinary Mapwich feature datasets
   (registry + ingest), with no new UI kind.

### 3b. The flow, step by step (draft for Robbie to react to)

The visitor is Robbie in a meeting, phone in hand, talking about Highway 14 near Mankato.

1. **Tap the map** near Mankato (or search "Mankato"). The details panel shows the place's numbers
   as today, plus one new line near the top: **"Planning region: Mankato/North Mankato APO ›"**.
   Every county and tract that falls in an MPO gets this line (precomputed lookup from the MPO
   shapes Mapwich already has, D-378). Places outside any MPO say "Rural: planned by MnDOT District 7"
   later, if we add state DOT districts / RPOs.
2. **Tap the MPO line.** The map outlines the MPO (shipped behavior) and the panel becomes the
   **MPO profile**: name, states, a one-sentence explainer ("An MPO plans and funds roads, transit
   and trails for a metro area of 50,000+ people"), and the region's headline totals (population,
   jobs, zero-car households, traffic deaths; needs #292).
3. **The "Plans" block** sits under the totals: four short rows, each with plain-language title,
   period and freshness:
   - Long-range plan · "2050 MTP, adopted 2025" ›
   - Projects funded next 4 years (TIP) · "2027–2030" ›
   - This year's work plan (UPWP) · "FY 2027" ›
   - Grants this region awards · "Regional Solicitation, next round 2028" ›
   Each row shows a small "link checked 3 days ago". The acronym is in parentheses, never first.
4. **Tap "Projects funded next 4 years".** Two cases:
   - *The MPO publishes TIP map data* (Met Council, DVRPC, …): the map draws the TIP projects as
     lines and points, styled by project type (road, transit, bike/walk, safety) from design tokens.
     The panel lists them, nearest first.
   - *It doesn't*: the row opens the MPO's TIP page in a new tab, with a one-line note "Opens
     mnmapo.org". No dead end: if the link is broken, it opens the archived copy and says so.
5. **Tap a TIP project on the map.** The panel shows the project in plain words: what, where,
   who's building it, cost, year, fund source, and a link to its row in the TIP. Below it,
   "Around this project": the ten numbers for the tracts it touches (zero-car households, people
   65+, traffic deaths nearby), with the usual reliability notes.
6. **Back out one level** with the panel's back arrow (a breadcrumb: Mankato › MAPO › TIP ›
   project). Nothing is lost; the URL carries each step, so the view can be shared or sent as a link
   preview.
7. **Tap "Compare with similar regions"** at the bottom of the MPO profile. Compare opens with 4–5
   MPOs of similar size and density (#291 applied to MPOs), so "how does our region compare?" is
   one tap.
8. **Tap "Grants this region awards"** → the MPO's solicitation page; underneath, "Federal
   programs" lists the current national discretionary programs that fit (SS4A, BUILD, …) with
   status ("FY26 round closed May 2026") from a small, dated registry the lead updates.
9. **"Carry it out"** from any level: Copy citation, Download CSV (shipped), Save map image (section 4).
10. Later: **cities** get the same Plans block, with the capital improvement program (CIP) and
    comprehensive plan, from the same registry, once cities are places (#332).

### 3c. How the links get found and kept fresh (mostly automatic)

**Registry.** One small file in the repo, e.g. `data/plans/mpo-documents.yaml`, one entry per
MPO keyed by the NTAD `MPO_ID` already used in `mpo=`:
`homepage`, then per document kind (`lrtp`, `tip`, `upwp`, `grants`, later `title6`, `cip`): the
landing-page URL, an optional direct PDF, its Wayback copy, the plan name and period, how it was
found (`state-index`, `sitemap`, `search`, `hand`), `first_seen`, `last_checked`, `status`, and
`approved` (date). Plain text in git, so every change is a reviewable diff.

**Find (one-time, then yearly).**
1. *Seed homepages*: state DOT MPO index pages (MnDOT lists all 8 MN MPOs), Wikidata, then a web
   search per MPO for the rest. Script first; agent only for leftovers.
2. *Crawl*: read each site's `sitemap.xml` (most have one) or its homepage navigation; score links
   by a synonym list (TIP/RTIP/Transportation Improvement Program; UPWP/OWP/Work Program;
   MTP/LRTP/RTP/Regional Plan/Policy Plan/"20xx" plan names; Solicitation/Call for Projects/Grant).
   Prefer landing pages that stay put ("current-tip").
3. *Confirm*: a cheap model reads the top candidate page's title and first lines and answers
   "is this the X for MPO Y, and which years?" Only for ambiguous cases.

**Review (light, Robbie's 2–4 hours/week protected).** A generated review page per batch (one
state at a time, Minnesota first): one row per MPO, four links, "looks right" checkboxes. A state
of 8 MPOs is ~10 minutes. After the first approval, only *changes* come back for review. Robbie
could delegate this to the lead entirely; links to public agency pages aren't sensitive.

**Keep fresh (automatic).**
- A weekly GitHub Action (free on a public repo) fetches each link with an honest user agent and
  records: OK; moved (redirect, still the same kind of page) → auto-update the URL; blocked (403)
  → "can't verify", keep; dead (404/410, timeout twice) → switch the visitor to the Wayback copy
  and open one GitHub issue per week listing all breaks; soft-404 (the page title no longer
  contains the plan's keywords) → treat as dead.
- On every approved link, ask the Wayback Machine to save a copy (free Save Page Now API), so a
  fallback always exists.
- A yearly "rollover" pass (July–October, when most UPWPs and TIPs turn over) re-runs Find and
  shows only the diffs.

**Size and cost.** Registry + finder + checker + review page: **M (~275k)**. MPO profile panel with
Plans block: **M (~275k)** (after #292). TIP projects as feature datasets: **S (~100k) each**
for Met Council (first, public domain on MN Geospatial Commons) and DVRPC. Running cost: **$0**
(GitHub Actions, Wayback, static JSON on R2/site). Fork candidate: no (but see "plan contents",
below).

**Fork candidate, flagged:** reading *inside* the plans (search "Highway 14" across every MPO's
TIP PDF, extract project lists, compare plan goals) is the "comparing plan contents" item the
roadmap lists under "Not now" as a possible paid product. It needs PDF storage, text extraction
and LLM calls at scale; running cost likely above $50/month. **Fork candidate.**
## 4. Outputs planners need

What already exists: CSV download with a "Cite as" line (`apps/web/src/lib/csv.ts`), a "Cite as"
row on each dataset's page, link previews, share URLs. Missing: anything that carries the **map**
or the **number with its citation** into a Word memo, a slide or a printed board.

| Output | What the visitor sees/does | Why it matters | Size · cost |
|---|---|---|---|
| **Copy for my memo** | One button on a value: copies "Ramsey County: 9.1% of households have no vehicle (±0.4), ACS 5-year 2020–2024, U.S. Census Bureau table B25044, via mapwich.org/…" | This is what goes into a staff report, verbatim; today it's retyped | S (~100k) · $0 |
| **Save map image** | PNG of the current view with title, legend, source line, date and a small Mapwich mark; landscape or square | Board memos, slides, grant attachments; replaces screenshots of Google Maps | M (~275k; MapLibre `preserveDrawingBuffer` + canvas compositing for legend/text) · $0 (client-side) |
| **Print layout** | "Print" gives a letter or tabloid page: map, legend, the ten numbers, sources, QR code back to the live view | Public-meeting boards and handouts | S–M after the image export (~150k) · $0 |
| **Embed** | "Embed" gives an `<iframe>` snippet for a locked view (dataset, place, period) with a small legend | MPO and city websites, story maps, Specials re-use | M (~275k; a chrome-less route + size guard) · probably $0 at current traffic; watch Vercel bandwidth if an agency embeds on a busy page |
| **Grant data table** | For a place, MPO or picked area: the grant-ready numbers (population, poverty/≤200% FPL, zero-car, disability, 65+, traffic deaths 5-yr and per 100k, archived "disadvantaged tract" share) in one table with citations; copy as table or CSV | The same table gets rebuilt for every SS4A, BUILD, TA application | S–M (~150k) after totals (#292) · $0 |
| **Methods note** | A per-dataset "How this was made" paragraph a consultant can paste into an appendix | Credibility in formal documents | Exists in part (dataset pages); S to make copyable |

Notes: citations should name the agency and table, not just "Mapwich". Image and print exports
must carry the vintage and the reliability warning when one applies, or a stale/unreliable number
travels without its caveat.

## 5. Top 10

Ordered for Robbie's weekly use (the tie-break). Sizes: S≈100k, M≈275k, L≈500k tokens.

1. **Place-first "ten numbers" card.** Search or tap a place and see its ten planner numbers with
   benchmarks (state, US) before choosing any dataset. *Why:* the in-meeting lookup, in one tap.
   M (~275k) · $0 · not a fork · builds on S1 static details, reliability warnings, compare.
2. **Cities and metros as places (#332).** Search "Brooklyn Park" and get the city's own numbers
   with ±. *Why:* most conversations name a city, not a county. L (~350–450k, from the issue) ·
   $0 · not a fork · builds on search, ACS ingest.
3. **MPO and county totals (#292).** With an MPO in focus, its population, jobs, zero-car
   households etc. as one regional number with a combined MOE. *Why:* "how many people in our
   MPO?" is asked weekly. M (~275k) · $0 · not a fork · builds on D-378 MPO focus.
4. **MPO profile with a "Plans" block + self-checking plans registry.** Tap a region and get its
   long-range plan, TIP, work plan and grant program links, each "checked N days ago", with
   archived fallbacks. *Why:* the rabbit hole; the thing no competitor has. M + M (~550k) · $0
   (GitHub Actions + Wayback) · not a fork · builds on D-378, #292.
5. **TIP projects on the map (Met Council first, then DVRPC).** Funded projects as lines/points;
   tap one for what, where, cost, year, and the numbers around it. *Why:* "what's planned on this
   road?" S (~100k) each as registry + ingest · $0 · not a fork · builds on the `features` dataset
   kind (as AADT).
6. **Copy for my memo + Save map image.** A citation line and a clean PNG with legend and source.
   *Why:* every lookup ends in a memo or slide. S + M (~375k) · $0 · not a fork · builds on CSV
   citations.
7. **Similar places, including similar MPOs (#291).** "Regions like ours" one tap into Compare.
   *Why:* peer regions for plans and grants. S–M (~150–275k) · $0 · not a fork · builds on
   compare, #292 for MPO-level inputs.
8. **Grant kit table.** The standard grant numbers for a place, MPO or area, with citations, plus a
   small dated list of open federal programs (SS4A, BUILD) and their status. *Why:* repeated for
   every application; saves hours. S–M (~150k) · $0 · not a fork · builds on #292, items 1 and 6.
   **Sensitive wording:** the "underserved / disadvantaged" columns rest on rescinded federal tools
   (CEJST) and SS4A's current definition; Robbie should approve the labels.
9. **Pick or draw an area (corridor, station area).** Tap tracts or draw a ½-mile buffer around a
   line and get its totals. *Why:* corridor and station-area studies, TIP project surroundings.
   L (~500k; client-side area weighting on block-group files) · $0 · not a fork · builds on #292.
10. **Embed and print.** An embed snippet for a locked view, and a letter/tabloid print layout with
    QR code. *Why:* public meetings and agency websites; also spreads the portfolio. M + S–M
    (~425k) · ~$0, watch bandwidth · not a fork · builds on item 6.

Honorable mentions: offline-friendly place summaries for bad meeting-room signal (S); federal
performance-target peers (PM1 safety five-year averages by MPO, M, needs MPO totals); rural
planning organizations and state DOT districts as places so rural areas get the same Plans block
(M). **Fork candidate:** searching and comparing plan *contents* across MPOs (PDF extraction + LLM
at scale; running cost above $50/month).

## Sources

All accessed 2026-10-27.

Policy status
- CRS, Surface Transportation Authorization Legislation: Timelines and Extensions (2026-09-14): https://www.everycrsreport.com/files/2026-09-14_IG10101_7bde9a13a694b6e97925717dcb69733c2b454af8.html
- Holland & Knight, Duffy reauthorization priorities (2026-07-27): https://www.hklaw.com/en/insights/publications/2026/07/dot-secretary-duffy-reiterates-surface-transportation-reauthorization
- USDOT SS4A program page: https://www.transportation.gov/grants/SS4A ; FY26 NOFO: https://www.transportation.gov/sites/dot.gov/files/2026-03/SS4A-FY26-NOFO.pdf
- HDR, SS4A FY2026 NOFO summary (2026-03-27): https://www.hdrinc.com/node/12111
- USDOT FY2026 BUILD NOFO: https://www.transportation.gov/sites/dot.gov/files/2025-12/FY_2026_BUILD_NOFO_Final.pdf ; CSAC summary: https://www.counties.org/news-and-media-article/fy-2026-build-nofo-released-applications-due-february-24-2026/
- Harvard EELP tracker, Justice40 rescission: https://eelp.law.harvard.edu/tracker/rollback-trump-rescinded-bidens-executive-order-14008-that-established-justice40-initiative/ ; CEJST removed: https://eelp.law.harvard.edu/tracker/ceqs-climate-economic-justice-screening-tool-removed/ ; ETC Explorer: https://eelp.law.harvard.edu/tracker/dot-launched-the-equitable-transportation-community-explorer
- SEJ, EPA removes EJScreen: https://www.sej.org/node/49426
- AAAE alert, DOT Title VI rule (2026-06-11): https://alerts.aaae.org/latest/regulatory_061126 ; FR public inspection 2026-11790: https://public-inspection.federalregister.gov/2026-11790.pdf ; Planetizen (2026-06): https://www.planetizen.com/news/2026/06/137818-usdot-will-stop-enforcing-key-civil-rights-law
- Huntsville Area MPO resolutions (May 2025, PL funds and PEAs): https://www.huntsvillempo.org/wp-content/uploads/2025/05/Resolutions_May-2025.pdf

MPO sites surveyed
- Met Council: https://metrocouncil.org/Transportation/Planning-2/Key-Transportation-Planning-Documents.aspx ; TIP GIS: https://gisdata.mn.gov/dataset/us-mn-state-metc-trans-tip-final-data
- CMAP: https://cmap.illinois.gov/funding-assistance/transportation-improvement-program/
- DVRPC: https://www.dvrpc.org/our-work/transportation-improvement-program ; TIP GIS: https://catalog.dvrpc.org/dataset/dvrpc-fy2025-tip-for-pa-fy25-28-lines
- NCTCOG: https://www.nctcog.org/trans/funds/tip
- SANDAG: https://www.sandag.org/funding/grant-programs
- ARC: https://atlantaregional.org/what-we-do/transportation-planning/unified-planning-work-program-upwp/
- MAPO: https://mnmapo.org/tip/ · St. Cloud APO: https://stcloudapo.org/current-plans/current-tip/ · Cheyenne MPO: https://www.plancheyenne.org/transportation/transportation-improvement-program/ · Flint Hills MPO: https://www.flinthillsmpo.org/upwp
- MnDOT MPO TIP index: https://www.dot.state.mn.us/planning/mpo/transportation-improvement-program.html
- NTAD MPO layer (fields: ID, name, state, area only): https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_Metropolitan_Planning_Organizations/FeatureServer/0
- Wayback availability API: https://archive.org/wayback/available
