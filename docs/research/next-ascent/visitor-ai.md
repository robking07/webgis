# Visitor-facing AI, priced (research notes R6)

Status: complete (2026-10-27). All nine sections written.
Next: none; the lead harvests. Open checks are at the end of section 9.

Research for the next-phase plan. Not a decision. Robbie's rule: "research it, decide later."
Every running cost below is the model bill only; Vercel Hobby, R2 and Supabase stay inside their
free tiers for these ideas unless a row says otherwise.

## 1. Model prices (checked 2026-10-27)

USD per million tokens, from the official pricing pages on 2026-10-27.

| Model | Input | Cached input | Output | Source |
| --- | --- | --- | --- | --- |
| Claude Haiku 5.5 (prompts up to 100k tokens) | $0.10 | $0.01 | $0.50 | platform.claude.com/docs/en/about-claude/pricing |
| Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 | same |
| Claude Sonnet 5.5 | $2.00 | $0.10 | $10.00 | same |
| Claude Opus 5.5 | $4.00 | $0.20 | $20.00 | same |
| Gemini 2.5 Flash-Lite | $0.10 | – | $0.40 | ai.google.dev/gemini-api/docs/pricing |
| Gemini 3.1 Flash-Lite | $0.25 | – | $1.50 | same |
| OpenAI gpt-5-nano | $0.05 | $0.005 | $0.40 | developers.openai.com/api/docs/pricing |
| OpenAI gpt-5-mini | $0.25 | $0.025 | $2.00 | same |
| Cloudflare Workers AI llama-3.2-3b | $0.051 | – | $0.335 | developers.cloudflare.com/workers-ai/platform/pricing |

Embeddings (for "find maps" search): OpenAI text-embedding-3-small $0.02; Gemini Embedding 2 $0.20
($0.10 batch); Cloudflare bge-small-en-v1.5 $0.020, bge-m3 $0.012.

Free allowances that matter here:
- **Anthropic Batch API:** 50% off input and output (results within 24 hours). Fits anything built
  ahead of time.
- **Cloudflare Workers AI:** 10,000 "neurons" a day free (about $0.11 a day of usage), then
  $0.011 per 1,000. Mapwich's static files are already on Cloudflare R2.
- **Vercel AI Gateway:** $5 of model credit every 30 days on the free tier; buying credit ends it.
  Useful as a hard ceiling: with no card on file, the bill can't pass $0.
- **Gemini API free tier:** most Flash models are "free of charge" on the free tier, but Google may
  use free-tier prompts to improve its products. Not a fit for visitor questions (privacy).

Takeaway: a small model (Haiku 5.5, Flash-Lite, gpt-5-nano) now costs about **$0.0001 to $0.0005 per
short question**. The cost risk is no longer the price per question; it's abuse (scripted floods) and
choosing a big model by habit. Sonnet 5.5 costs about 20× Haiku 5.5 on these jobs.

## 2. What Mapwich already has to ground AI in

Any visitor AI should stand on what's already built, so it can't invent figures:

- **The registry** (`data/registry/datasets/*.yaml`, exported to `apps/web/src/generated/registry.json`):
  138 datasets, each with title, plain "phrase", description, tags, source and citation, vintage,
  unit, universe, levels and timeline. The whole catalog as `id|title|tags|levels` is ~14,000
  characters, about **3,500 tokens**: small enough to hand a model in full today. At Library scale
  (thousands of maps) it needs a shortlist step first (section 7).
- **The URL is the whole view.** `?d=` dataset, `b=` second dataset, `lv=` level, `t=` period,
  `since=` change-from period, `in=` drilled-into place, `mpo=`, `at=` camera
  (`apps/web/src/lib/url-state.ts`). An AI that outputs a URL can open any map Mapwich can draw,
  and the numbers on screen still come from the static files, not the model.
- **Place search** (`lib/search.ts`, `geo/search.json` on R2): states, counties, Gazetteer places and
  MPOs, with abbreviations and an alias. An AI can name a place; this search resolves it.
- **Static numbers per place** (`details/<state>.json`, `values/...`, margins and counts on R2):
  every dataset's value for a place, plus reliability flags (D-222) and margins (D-257).
- **Glossary** (`glossary.json`, 263 lines), **relations** (topic groups, parts of a whole),
  **Combinations** (72 statistically checked dataset sets, D-447) and **insights**.
- **A number checker** for Specials (`scripts/check-special-numbers.mts`): the pattern for checking
  that every figure in AI text matches the data.
- **Server side:** only `/api/keepalive` and `/api/specials/revalidate` today. A live AI feature
  would be the first visitor-facing server function that spends money.

## 3. What others ship (checked 2026-10-27)

| Who | What visitors get | Notes for Mapwich |
| --- | --- | --- |
| Google Data Commons | Plain-English "Explore" that answers with charts of its statistics; an MCP server (Sept 2025, now hosted on Google Cloud) so people's own AI agents can query it; a Gemini CLI extension (Dec 2025). | Closest model. Answers are charts and data, not prose; "bring your own AI" via MCP. |
| Esri ArcGIS | AI assistants: Survey123, Business Analyst and translation assistants GA (June 2026, no extra cost); a mapping assistant and ArcGIS Online assistant still beta. | For map makers inside ArcGIS, not public visitors. Planners will know these. |
| data.census.gov | A single keyword search bar (topics, places, years, table IDs). No conversational assistant found. | Room for "plain English to the right table/map". |
| PolicyMap, Social Explorer | No visitor AI assistant found in public pages. PolicyMap publishes an `llms.txt` for AI crawlers. | Paid incumbents haven't moved; a free grounded tool would stand out. |
| ChatGPT, Claude, Gemini (general) | People already ask them "what's the poverty rate in X". | The real competitor. They often mix vintages, drop margins and give no map. Mapwich's edge: the answer is a real map with source, vintage and margin. |

Sources: developers.googleblog.com (Data Commons MCP hosted on Google Cloud), blog.datacommons.org
(2025-10-02, 2025-12-02), esri.com/arcgis-blog "What's new in AI assistants (June 2026)",
census.gov data.census.gov pages, policymap.com/llms.txt. Searches for PolicyMap/Social Explorer AI
found nothing; absence isn't proof.

## 4. The long list

Per-use costs assume Claude Haiku 5.5 unless noted. "Build" is agent tokens (S≈100k, M≈275k,
L≈500k). Running cost is per month at 1k / 10k / 100k uses.

| # | Idea | What a visitor sees | Robbie's weekly use | Build | Running 1k / 10k / 100k | Fork? | Builds on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Ask the map** | Types "rent burden in Ramsey County tracts"; the map opens on that dataset, place and level. No AI prose, no AI numbers. | High: fastest path to the right map in a meeting. | M | $0.10–0.50 / $1–5 / $11–50 | No | registry, URL state, place search |
| 2 | **Place brief, AI-picked facts** | A "what stands out here" box on each place: 4–6 facts, each a templated sentence with its number, rank and source. AI only chooses and orders facts, ahead of time. | High: quick read of an unfamiliar county before a call. | M | $0 (built ahead: ~$1.10 per refresh for states+counties, ~$29 with tracts) | No | details files, reliability, insights |
| 3 | **Find maps about…** | Search "heat and old people" → matching maps (Featured and Library), even with no shared words. | High once Library has thousands of maps. | S–M | ~$0 (embeddings built ahead; query embedding free under Cloudflare's daily allowance) | No | registry, Library cards |
| 4 | **Library map captions** | Each automatic Library map gets a labeled one-line "what this map shows" and "how to read it". | Medium | S | $0 (built ahead: < $1 per 5,000 maps) | No | Library maps, relations |
| 5 | **Bring your own AI (MCP + llms.txt)** | Visitors connect Claude/ChatGPT to Mapwich; their AI looks up Mapwich numbers and links back to the map. They pay their own tokens. | Medium: Robbie can ask his own Claude questions grounded in his site. | S–M | ~$0 (static files; a small function if MCP is hosted) | No | static files on R2, registry |
| 6 | **Explain this number** | Click "what does this mean?" by a value: plain explanation of the measure, universe, margin, and how this place ranks. | Medium | S | $0 if templated + precomputed per dataset; live version ~$0.30 / $3 / $30 | No | glossary, reliability, registry |
| 7 | **Compare-two-places summary** | On the compare page, 3–5 templated "biggest differences that pass the test" with AI ordering. | Medium | S–M | $0 templated; live AI pick ~$1 / $10 / $100 | No | compare page, test of difference |
| 8 | **Grant data table** | Pick a place and a grant program (SS4A, RAISE, CDBG…); get a table of the usual need measures with margins, sources and a CSV. | High for a planner. | M | $0 with hand-checked presets; free-text live ~$1 / $10 / $100 | **Fork candidate** (grant-writing helper for consultants and small towns) | CSV download, registry, compare |
| 9 | **Plain-English filter** | "tracts with rent burden over 50% and few cars" → the existing filters set themselves. | Medium | M | same as #1 | No | filters, URL state |
| 10 | **Map alt text and screen-reader summary** | Every map gets a text summary (highest, lowest, pattern) for screen readers and link previews. | Low directly; required for an honest accessibility story. | S | $0 (templated, built ahead) | No | values, og cards |
| 11 | **"What changed here"** | On change maps, the biggest real changes (outside margin) listed, AI ordering only. | Medium | S | $0 (built ahead) | No | change maps, margins |
| 12 | **Suggested next maps** | "People looking at this also check…" from relations and Combinations, AI-written labels built ahead. | Low–medium | S | $0 | No | relations, Combinations |
| 13 | **Spanish (and more) interface and captions** | Machine-translated interface and captions, labeled. Robbie's writing not translated without his OK. | Low | M | $0 (built ahead) | No | site copy |
| 14 | **Chat with a Special** | Ask questions of a Special. | Low | M | ~$1 / $10 / $100 | No | Specials |
| 15 | **Custom place report (PDF)** | A multi-page report for a chosen area with maps and tables. | Medium | L | $0–small | **Fork candidate** (agency reports) | place pages, CSV |

Dropped or parked from the list: #14 (too close to Robbie's voice; AI must never write as him), free
chat in general (unbounded cost, invented numbers, hard to label), image or voice input (no need yet).

Sensitive-wording flags for the lead to send Robbie: anything that ranks or describes places by
race, ethnicity, health, poverty or immigration (#1, #2, #7, #11). Section 5 and 6 say how each stays
safe; the wording of labels needs Robbie.

## 5. Deep dive A: Ask the map

**What a visitor sees.** One box above the map: "Ask for a map (e.g. *rent burden in Ramsey County
tracts*, *where did work from home grow most*)." Press Enter; the map changes. A small line under the
box says what it did, in plain words, with an undo: "Opened **Renters paying 30%+ of income on rent**,
census tracts, Ramsey County MN, 2020–2024. *Picked by AI from Mapwich's map list. Not right? Change
it.*" Every number on screen is the ordinary map, legend and details panel. The AI writes no
sentences about the data and states no figures.

**Why it serves Robbie weekly.** He's "the map guy": people ask him quick US place questions. Today
he opens the dataset menu, finds the map, searches the place, sets the level and period: five or six
steps. One typed line, then a link to paste into a chat or email. It also gets more valuable as the
Library grows from 138 maps to thousands, where menus stop scaling.

**How it works on the foundation.**
1. Browser sends the typed text (max 200 characters) to one server function (`/api/ask`).
2. The function sends a small model the instructions plus the map list (id, title, tags, levels,
   periods: ~3,500 tokens today, cached) and asks for a filled form, not prose:
   `{ dataset, second_dataset?, place_name?, level?, period?, change_from?, no_match_reason? }`.
3. The function **checks every field against the registry**: dataset ids must exist, the level must be
   one the dataset has, periods must be on its timeline (`periods.json`), change maps only where the
   feature-fit rule allows. Anything that fails is dropped, not guessed.
4. The browser resolves `place_name` with the existing place search (`searchPlaces`), so places come
   from the Gazetteer, never from the model.
5. The result is a normal Mapwich URL (`?d=…&lv=…&t=…&in=…`). Shareable, reloadable, works with AI
   switched off.

At Library scale (thousands of maps) step 2 first shortlists the 40 closest maps with the "find maps"
search (idea #3, section 7), so the prompt stays ~2,000 tokens.

**How answers stay grounded.** The model can only pick from closed lists, and code checks every pick.
Worst case is the wrong map, which the visitor sees immediately (the title and legend say what it
is). It never produces a number, a ranking or a claim. Prompt injection ("ignore your instructions
and…") can at most pick a wrong map from the list.

**Labeling.** The line under the box always says "Picked by AI" and links to a short "How Ask works"
note (model name, what it can't do, accuracy score from the test set, monthly cost). The map itself
carries no AI label because nothing on it came from AI.

**Failure handling.**
- No good match → "Mapwich doesn't have a map for that yet," plus the 3 closest maps and the normal
  dataset menu. Optionally the question is kept (anonymous) as a data request.
- Model slow (> 4 s), down, or monthly cap reached → the box quietly works as the existing place and
  dataset search; a note says "Ask is resting this month."
- Ambiguous place ("Springfield") → show the place-search picker, as search does today.

**Abuse and cost caps (belt and braces).**
- Hard ceiling at the provider: a monthly spend limit on a dedicated workspace key, or the Vercel AI
  Gateway's free $5 a month with no card on file (the bill can't pass $0).
- Our own counter: a monthly budget in the function (e.g. stop at $10) and a per-visitor limit
  (e.g. 20 asks an hour) using Vercel's firewall rate limiting or a free Upstash/Supabase counter.
- `max_tokens` ≈ 150, one shot, no conversation history, 200-character input.
- A kill switch (one env var) the lead can flip without a deploy.

**Sensitive topics.** Questions like "where do the most Black families live" route fine (the dataset
exists; the map shows shares, with sources). Value-laden asks ("dangerous neighborhoods", "where
illegal immigrants live", "bad schools") must not be mapped onto demographic datasets. The
instructions say so, the test set includes such probes, and a short deny-list of words returns "no
match" with a neutral note. The wording of that note needs Robbie.

**Accessibility.** A labeled text box, Enter to submit, the result line announced by an `aria-live`
region, focus stays in the box, undo is a real button. Keyboard and screen-reader users get the same
outcome as clicking through menus; nothing is only visual.

**Privacy.** Don't store IP addresses with questions. Keep question text (no other data) 30 days for
the accuracy review, say so on the How Ask works note. Don't use providers that train on prompts.

**Build size:** M (~275k tokens): the function, the registry check, the box and result line, the
caps, a 200-question test set with a script that scores it, and the How Ask works note.

**Cost tables (Ask the map).** Per ask: ~4,000 input tokens (instructions + map list), ~100 output,
+10% for retries.

| Model | Per ask | 1k asks/mo | 10k | 100k |
| --- | --- | --- | --- | --- |
| Claude Haiku 5.5, map list cached | ~$0.0001 | $0.10 | $1 | $11 |
| Claude Haiku 5.5, no cache hits | ~$0.0005 | $0.50 | $5 | $50 |
| gpt-5-nano, cached / not | $0.00007 / $0.0003 | $0.07 / $0.30 | $0.70 / $3 | $7 / $30 |
| Gemini 2.5 Flash-Lite | ~$0.0005 | $0.50 | $5 | $50 |
| Claude Sonnet 5.5, cached (if small models score too low) | ~$0.0016 | $1.60 | $16 | $160 |
| Claude Sonnet 5.5, no cache hits | ~$0.010 | $10 | $100 | $1,000 |

Plus $0 hosting (one Vercel function; time spent waiting on the model isn't billed as active CPU on
Hobby's fluid compute, per Vercel's docs; check at build time). Test-set runs: 200 questions ≈ $0.10
each run on Haiku 5.5.

Reading: on a small model with the map list cached, Ask fits well under the $50 cap even at 100k
asks a month, the scale of a popular site (at that traffic the cache stays warm; uncached it would
hit the cap exactly). Mapwich's real traffic today is far below 10k. The cap matters for abuse, not for honest
use. Sonnet-class is only affordable to ~10k asks; use it only if a small model fails the test set.

**Risks.** Wrong-map rate (measure it; publish it). A visitor may read "AI" and distrust the map
under it; the label must say plainly that numbers aren't from AI. Model ids retire: pin a model,
re-run the test set before switching.

## 6. Deep dive B: Place brief ("What stands out here")

**What a visitor sees.** On a place page and in the details panel: "What stands out in Ramsey County,
MN" with 4–6 bullet facts, e.g. "**Renters paying 30%+ of income on rent: 49%**, higher than 88% of US
counties (Census Bureau, 2020–2024 ACS; margin ±1.4 points)." Each fact links to its map. A label:
"Facts picked automatically from Mapwich's data. Sentences are templates; numbers come straight from
the data." No adjectives about people or places.

**Why it serves Robbie weekly.** Before a call about a county he hasn't worked in, he gets the five
things worth knowing in ten seconds, each one click from its map. It also makes 3,200 county pages
worth landing on from a search engine (portfolio value).

**How it works ("AI picks, templates write").**
1. Build time, on Robbie's machine (like ingest): for each place, a script gathers every value with
   its US and state rank, margin, reliability flag and the dataset's `phrase`, unit and source.
2. A plain script (no AI) pre-filters candidates: only values that are reliable (D-222), outside the
   middle of the distribution, and allowed by the feature-fit rule.
3. A small model gets that candidate list and returns only **ids and an order** ("pick the 5 facts a
   planner would want first, one per topic"). Optional: skip the model entirely and pick by a score
   (how extreme, how reliable, topic spread). The model's job is judgment about relevance, nothing more.
4. Sentences are filled from fixed templates per unit ("{value} of {universe}, higher than {pct}% of
   US {level}s"). The template text is written once and reviewed by Robbie; the model never writes
   a sentence.
5. Output: one small JSON per state on R2 beside `details/`, read like click details today.
6. A check script (the Specials number checker pattern) confirms every number in every brief matches
   the source file; any mismatch drops that brief.

**Labeling, sensitive topics.** Race, ethnicity, immigration and health facts can appear only as
neutral shares with sources, using the same template as any other measure. A default rule to propose:
race and ethnicity shares are never "standout" facts on their own (they describe who lives there, not
a problem); health facts show only with reliability. Robbie should approve that rule and the label
text (flag for the lead).

**Failure handling.** A place with too few reliable facts shows none (no box) rather than weak ones.
If a refresh fails checks, the previous briefs stay.

**Accessibility.** A plain list with text; every number has its unit and source in words, not only
color or icons.

**Build size:** M (~275k tokens) for states and counties; +S to add tracts.

**Cost tables (Place brief).** Built ahead with the Batch API (50% off; assumed to apply to Haiku 5.5
as to other models, confirm). Per place: ~6,000 input tokens (candidates), ~150 output (ids only).

| Scope | Places | Haiku 5.5 per refresh | Sonnet 5.5 per refresh | Running cost per month at 1k / 10k / 100k page views |
| --- | --- | --- | --- | --- |
| States + counties | ~3,250 | ~$1.10 | ~$22 | $0 / $0 / $0 (static files on R2) |
| + census tracts | ~85,000 | ~$29 | ~$570 | $0 / $0 / $0 |
| Score only, no model | any | $0 | – | $0 |

Refreshes happen when data changes (a few times a year), so even the tract run is a one-off line in
the budget, not monthly. R2 storage: ~2 KB per place, ~170 MB with tracts, inside R2's free 10 GB.

**Live alternative (not recommended).** Writing the brief on each click: ~$0.001 per view on Haiku
5.5 → $1 / $10 / $100 a month, with free prose that needs numbers checked live. Building ahead is
cheaper, checkable and reviewable.

## 7. Zero- and near-zero-cost variants

What survives a $50/month total cap (hosting included):

| Idea | Zero-cost form | Running cost | Survives? |
| --- | --- | --- | --- |
| Place brief (#2) | Built ahead; or score-only with no model | $0 | Yes |
| Library captions (#4), suggested next maps (#12), alt text (#10), "what changed" (#11) | Built ahead with Batch or plain templates | $0 (< $5 per full refresh) | Yes |
| Find maps (#3) | Embeddings of map cards built ahead (5,000 maps × 60 tokens ≈ $0.01). Query side, cheapest first: (a) **no live model at all**: at build time a model writes synonyms and plain phrasings into each map's search terms, and the existing keyword search does the rest; (b) query embedding on Cloudflare Workers AI (bge-small) inside the free 10,000 neurons a day; (c) in-browser embedding model (~23 MB download, too heavy for phones on first visit). | $0 | Yes, start with (a) |
| Bring your own AI (#5) | `llms.txt` and documented static file URLs (no server); later a small MCP server as one Vercel function | $0 | Yes |
| Explain this number (#6) | One explainer per dataset built ahead + templated rank sentence | $0 | Yes (overlaps "Why this matters" #115, which is approval-gated, D-279) |
| Grant data table (#8) | Hand-checked presets per grant program; table and CSV by code | $0 | Yes (presets only) |
| Ask the map (#1), plain-English filter (#9) | No true zero form. Near-zero: small model, cached list, hard cap | ~$1 at 10k asks | Yes with a cap |
| Compare summary (#7) | Templated "biggest real differences" (test of difference already exists) | $0 | Yes; live AI version only under cap |
| Chat with a Special (#14), free chat | – | unbounded | No |

Client-side language models: Chrome's built-in model (Prompt API) works only in some desktop Chrome
builds; WebGPU models are 1 GB+ downloads. Not a fit for a phone-first public site in 2026–27. Revisit
yearly.

Bottom line: everything except live Ask and live compare can be **built ahead and served as static
files**, which matches how Mapwich already works (D-198, D-210). Live Ask costs about a dollar a month
at realistic traffic and needs a hard cap mainly against abuse.

## 8. Responsible-AI framing for skeptical planners

The pitch Robbie already uses (spec and token budget before every task, stats on each issue) extends
naturally to visitor AI. Proposed rules:

1. **AI never states a number.** Numbers come from the data files; AI only picks maps, picks facts or
   orders them. This is the headline for skeptics, and it's checkable.
2. **AI never writes as Robbie.** No AI prose in Specials or editorial; AI-picked items carry a label
   that says what AI did ("Picked by AI", "Facts picked automatically").
3. **Built ahead where possible.** Anything that can be computed once and checked, is. Live AI only
   where it can't (Ask).
4. **Published accuracy.** A fixed test set (200 questions for Ask, each with the right map; a
   random 50 briefs for place briefs, graded by the lead with a rubric and spot-checked by Robbie).
   Publish the score and the date on the disclosures page; re-run before any model change. For briefs,
   the number check must pass 100% or the brief doesn't ship.
5. **Published cost.** Monthly model spend and asks per month on the disclosures page, next to the
   build token totals Robbie already posts.
6. **A visible off switch and fallback.** The site works fully with AI off; say so.
7. **Privacy.** No IPs stored with questions, 30-day retention, no training on visitor prompts
   (pick providers and settings that guarantee it, avoid free tiers that train).
8. **Sensitive topics have written rules** that Robbie approves (section 5 and 6), and the test set
   includes probes for them.

What to disclose on the How Ask works / disclosures page: model and provider, what the AI does and
doesn't do, accuracy score and date, monthly cost, retention, how to report a wrong pick. Disclosures
copy is on hold by Robbie (1.6), so the lead should treat this as content for him to write or approve.

## 9. Recommendation and top 10

**Recommendation.** Do AI in two layers, cheapest first.

- **Next phase (commit):** the zero-cost layer, all built ahead: "find maps" with AI-written search
  terms (#3a), Library captions (#4), and place briefs in the "AI picks, templates write" form for
  states and counties (#2). Combined build ≈ M + S + M (~650k tokens), running cost $0, one-off model
  cost under $5 per refresh. These are also what the Library plan needs anyway ("an overwhelming
  amount of data", findable and labeled).
- **Priced pilot for Robbie to decide:** Ask the map (#1) on Claude Haiku 5.5 with a $10/month hard
  cap, a published test-set score and a kill switch. Expected cost at today's traffic: under $1 a
  month. Build M.
- **Cheap portfolio extra:** `llms.txt` plus documented file URLs (#5), S. It's what Data Commons
  does, and it lets people bring their own AI at no cost to Mapwich.

**Tradeoff.** The zero-cost layer is safe and fits the cap forever but feels less "AI" to a visitor;
Ask is the feature people would notice and Robbie would use most, but it's the first live,
money-spending, abuse-exposed server feature. By the tie-break (Robbie's weekly use), Ask wins on
usefulness; by cost and risk, the built-ahead layer goes first and also makes Ask better (its
shortlist step reuses "find maps").

**Top 10.**

1. Ask the map: type a request, the right map, place and level open; AI picks from a closed list,
   never states numbers. M; ~$1/mo at 10k asks (Haiku 5.5).
2. Place brief: 4–6 standout facts per place, AI picks, templates write, numbers checked. M; $0 running.
3. Find maps about…: AI-written search terms built ahead (later, embeddings). S–M; $0.
4. Library map captions: labeled "what this shows / how to read it" for every automatic map. S; $0.
5. Bring your own AI: llms.txt now, a small MCP server later. S–M; ~$0.
6. Explain this number: per-dataset explainer + templated rank sentence. S; $0.
7. Grant data table: presets per program, table + CSV with margins. M; $0. **Fork candidate.**
8. Map alt text and screen-reader summaries, built ahead. S; $0.
9. Plain-English filter: "tracts with rent burden over 50% and few cars" sets filters. M; same as #1.
10. Compare-two-places "biggest real differences", templated with AI ordering. S–M; $0 (live AI ~$10/mo at 10k).

**Vision cost ranges (build tokens):** zero-cost layer #2–#4, #6, #8 ≈ 0.6–1.0M tokens over the
phase; Ask + filter ≈ 0.4–0.6M; MCP server ≈ 0.1–0.3M; grant table fork ≈ L–XL as a separate product.

**Open checks before building.** Confirm Batch discount applies to Haiku 5.5; confirm Vercel Hobby
rate-limit rules and fluid-compute billing for waiting time; confirm the Vercel AI Gateway free credit
works as a hard ceiling for this account; pick a provider data-retention setting that keeps visitor
questions out of training.

**For the lead (send to Robbie):** the AI label wording; the deny-list note for value-laden asks; the
rule that race and ethnicity shares are never "standout" facts on their own; whether to keep anonymous
unanswered questions as data requests; the $10 cap for the Ask pilot.
