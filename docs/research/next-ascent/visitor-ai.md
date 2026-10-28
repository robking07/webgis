# Visitor-facing AI, priced (research notes R6)

Status: sections 1–4 done (prices, foundation, what others ship, long list).
Next: deep dives (5, 6), zero-cost variants (7), framing (8), recommendation (9).

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
| 1 | **Ask the map** | Types "rent burden in Ramsey County tracts"; the map opens on that dataset, place and level. No AI prose, no AI numbers. | High: fastest path to the right map in a meeting. | M | $0.10–0.45 / $1–4.50 / $10–45 | No | registry, URL state, place search |
| 2 | **Place brief, AI-picked facts** | A "what stands out here" box on each place: 4–6 facts, each a templated sentence with its number, rank and source. AI only chooses and orders facts, ahead of time. | High: quick read of an unfamiliar county before a call. | M | $0 (built ahead: ~$1.30 per refresh for states+counties, ~$33 with tracts) | No | details files, reliability, insights |
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
