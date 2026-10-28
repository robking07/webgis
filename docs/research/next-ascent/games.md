# Games: a "Wordle for maps" and other ways to make map data playful

Research agent R8, 2026-10-27. Research only; not for merge. The lead harvests it.

Status: sections 1–4 done.
Next: 5. Recommendation and top 10.

## 1. The landscape

### What news sites run (word and logic puzzles)

| Game | What you do | Why people come back | Who makes each puzzle |
|---|---|---|---|
| **Wordle** (NYT) | Guess a five-letter word in six tries; tiles turn green, yellow or gray. | One puzzle a day, the same for everyone; a streak; an emoji grid you can share without spoiling the answer. | Josh Wardle's original was a pre-shuffled answer list baked into the page: it ran itself for months. NYT now has an editor pick from a curated list. |
| **Connections** (NYT) | Sort 16 words into four hidden groups of four; four mistakes allowed. Groups are colored easy (yellow) to tricky (purple). | The "aha" of a hidden link; the colored share grid shows the order you solved in. | Hand-made by an editor (Wyna Liu). |
| **Strands** (NYT) | Find themed words in a letter grid, plus one "spangram" that names the theme. | Theme reveal; hint meter. | Hand-made. |
| **Spelling Bee** (NYT) | Make words from seven letters. | No fail state: ranks (Good → Genius → Queen Bee) let you stop at any level. | Hand-curated word list. |
| **The Mini** (NYT) | 5×5 crossword. | A timer: under a minute is the brag. | Hand-made. |
| **Pips** (NYT, Aug 2025) | Place dominoes so each colored region meets its rule (sum, equal, different). Three difficulties. | Pure logic, can't lose, three levels a day. NYT's first logic game, a sign that the audience wants more than words. | Made by a puzzle editor. |
| **Crossplay** (NYT, Jan 2026) | Two-player Scrabble-like game in its own app; play friends, matched strangers, or an AI. | Playing *someone*: turns, chat, rematch. Passed a million downloads in about two weeks. | Not daily; the game is the rules, every match is new. |
| **The Atlantic games** (hub since June 2025) | **Bracket City** (solve nested clues in brackets, inside out; free, licensed from its creator Ben Gross), plus a crossword and smaller daily games. | Daily, quick, one shared puzzle. Bracket City and its archive are free; some others need a subscription. | Hand-made; the creator later released a tool so anyone can build one. |
| **Washington Post** | **Keyword**: fill blanks in words to reveal a six-letter keyword; a crossword and others. | Daily ritual. | Hand-made. |
| **Bloomberg** | **Pointed** (Mar 2025): a weekly 10-question news quiz where you spread 100 points across categories and can "leverage" or "hedge" (top score 190). **Alphadots** (Sep 2025): daily word puzzle with graphic clues. | Pointed turns a news quiz into a betting game: confidence matters, not just knowing. | Hand-written by editors each week. |
| **The Guardian** | **Wordiply** (from memory, not re-checked): make the longest word containing a given letter string. | Daily; a percentage score against the best possible. | Generated from a word list with editor checks. |

### Geography and data games

| Game | What you do | Why it works | How puzzles are made |
|---|---|---|---|
| **Worldle** (Teuteuf) | Guess a country from its silhouette in six tries. Each wrong guess shows the distance, a compass arrow and a "% close". Bonus rounds after (flag, capital, neighbors). | Hot/cold hints teach geography as you play; bonus rounds extend the session. | **Generated** from a list of countries; new one at local midnight. |
| **Globle** | Guess any country; each guess is colored on the globe hotter as it gets closer to the answer. Unlimited guesses. | The map itself is the hint. No fail, just a guess count. | Generated. |
| **Tradle** (from memory) | Guess a country from a treemap of what it exports. | The closest thing to "guess a place from its data fingerprint". Ends with a link to the full trade profile. | Generated from a trade-data site's tables. |
| **Travle** | Name every country on the shortest route between two given countries. Has a US-states version. | Map reasoning, not trivia. | Generated from a neighbor graph. |
| **Statele** | Wordle for US states: distance and direction after each guess. | Familiar, local. | Generated. |
| **GeoGuessr** | Dropped into Street View; click where you think you are. Daily challenge, duels, paid plans. Owns **Seterra** (click-the-place map drills, including counties by state). | Skill shows; duels; streamer culture. A real business, so a sign of what people pay for. | Generated from imagery; Seterra drills are static lists. |
| **NYT "You Draw It"** (2015) | Draw how you think a line chart goes, then the real line appears beside yours. | You commit to a belief before the reveal, so the surprise sticks. Copied widely (Flourish's "Draw the Line" template, the UK ONS); a statistics paper validated it as a way to test how people read graphs. | One per article, hand-chosen. |
| **NYT dialect quiz** (2013, "How Y'all, Youse and You Guys Talk") | Answer 25 questions about words you use; the end is a heat map of where in the US you sound like you're from. | The quiz ends in a **personal map**. Widely reported as the Times' most-visited piece of 2013. | Built once from a survey dataset; every visitor gets their own result. |
| **ONS "How well do you know your area?"** (UK; 2014, again 2022–23) | Pick your local area, answer about eight questions (slider guesses of census figures), see how close you were. Different questions each play; embeddable on council sites. | Your own place. Local councils and newspapers embedded it. A government statistics office did exactly what Robbie describes. | **Generated** from census tables, refreshed with new data releases. |
| **News quizzes** (Pudding essays, newsroom "how well do you know" quizzes; FiveThirtyEight, now closed, ran many) | Guess a number or pick an answer, then read the explanation. | Curiosity; the explanation is the payoff. | Hand-written one-offs. |

### What the winners share

1. **One small puzzle a day, the same for everyone**, done in 2–5 minutes. Scarcity is the hook; the
   archive comes later.
2. **A share grid that doesn't spoil**: colored squares or a score that says how you did, never the
   answer. This was Wordle's growth engine.
3. **Streaks**, stored on the device (Wordle's original kept them in browser storage, no account).
4. **Hints that teach**: Worldle's distance arrows and Globle's heat colors make a wrong guess useful.
5. **A graceful end with more to see**: Worldle's bonus rounds, Tradle's link to the full trade profile,
   the dialect quiz's personal map. This is Mapwich's "dive deeper".
6. **Word games are hand-made by editors; geography and data games are generated** from a table of
   places. Mapwich has the table (3,222 counties × 138 datasets), so it fits the generated model that
   can run itself on Robbie's 2–4 hours a week.
7. **Precedent for a statistics agency**: ONS and the NYT dialect quiz show "your place, guessed, then
   revealed" works for official numbers, not just words.

## 2. Is a "Wordle for maps" possible on Mapwich?

**Yes, and cheaply.** Everything a game needs already ships as static files:

- **County values and margins** for every dataset: `values/<id>/county.json` and `county.moe.json` on R2
  (same for states, tracts, block groups).
- **Every value for one place**, its "fingerprint": `details/<state>.json` on R2, `[value, margin]` per dataset.
- **County names with a center point** (for distance and compass hints): `apps/web/src/generated/splash-counties.json`
  (3,222 rows, 138 KB), already used by the splash questions.
- **Place search** (type-ahead for guesses): `lib/search.ts` and `geo/search.json`.
- **Reliability grading**: `gradeEstimate` in `packages/design` (CV under 15 = reliable, 15–30 caution, over 30 unreliable).
- **Plain-words numbers**: `formatValue` in `packages/design`, so clues read like the map's popups.
- **Pairs worth asking about**: `insights.json` (correlation checks with flags) and `combinations.json`.
- **Dive-deeper targets that already exist**: `/place/<geoid>`, `/compare/<a>/<b>?d=<dataset>`,
  `/map?d=<dataset>&in=<geoid>&lv=county`, `&since=` for change maps.

**How a daily game runs itself.** A build script (like the insights and Combinations generators) writes a
year of puzzles at once into one small JSON file, run after each data export. Each puzzle stores the
numbers it shows, so a later data refresh never changes an old puzzle's answer. The page picks today's
puzzle from the visitor's local date, as Wordle did. No server, no database, no daily writing: **running
cost $0** inside current Vercel and R2 use. Robbie can scan the year's list once if he wants, but doesn't have to.

**A reliability check, measured (2026-10-27, local data).** Across the 56 ACS datasets at county level, the
median dataset has **78% of counties reliable** (CV under 15); the worst (bike commuting 3%, Pacific Islander
share 5%, transit commuting 7%) can't be used for county questions at all. Among reliable counties, about
**a quarter of random pairs are not significantly different** at 90% confidence (their margins overlap). So
every generator must (1) only use reliable estimates (or non-ACS sources without graded margins), and (2)
for comparisons, only ask when the gap is larger than the combined margin (`|a − b| > √(moeA² + moeB²)`).
Script: rerunnable, in the session scratchpad; the lead can ask for it to be committed with the build.

### Concept A: Mystery County (the "Wordle for maps")

- **What a player sees.** Three data clues about today's county, in plain words, e.g. "Median rent: $780",
  "Homes built before 1960: 48%", "Average July high: 91°F". A guess box (type a county name; search
  fills in "Washington County, MN"). Six tries.
- **Each wrong guess** shows how far away it is ("410 mi"), a compass arrow toward the answer, a
  hot/cold word ("warm"), and unlocks one more clue: a 4th data clue, then the region ("Upper Midwest"),
  then the state's outline or name. A small US map marks each guess as a dot, so the map is the hint.
- **Share grid** (no spoilers):
  ```
  Mapwich County #42  4/6
  ⬛⬆️ 1,240 mi
  🟧↗️ 410 mi
  🟨➡️ 85 mi
  🟩📍
  mapwich.org/play
  ```
  plus a text version for screen readers ("Solved in 4: far, 410 miles, 85 miles, found").
- **Dive deeper.** The end card names the county, shows all six clues with "how it compares" (rank among
  about 3,200 counties and county equivalents, Puerto Rico included), and links: "See it on the map" (`/place/<geoid>`), each clue chip opens that dataset's map
  zoomed to the county (`/map?d=<id>&in=<geoid>`), and "Compare with your guess" (`/compare/<answer>/<closest guess>`).
- **How puzzles are generated.** A shuffled list of counties (an easy track from the ~300 most-populous
  counties first, since nobody can guess Loving County, TX from rent). For each, pick clue datasets where
  the county stands out (top or bottom 15% nationally), reliable, from different categories, and on the
  approved game list (section 3). **Check:** the clues must narrow the field. After all six clues, at most
  one county may match within each clue's displayed rounding; after the first three, between 5 and 200
  (not too easy, not hopeless). Puzzles that fail are skipped automatically.
- **Who it's for.** The public (geography fans, Worldle players); a portfolio piece ("a daily game
  generated from 138 datasets with statistical checks").
- **Size.** M (≈275k): generator with checks and a test ≈100k; page with guess box, hints, share, streaks ≈150k; review.
- **Running cost.** $0. **Fork candidate?** No. **Builds on:** details files, splash county list, search, design tokens.

### Concept B: Higher or Lower

- **What a player sees.** Two places side by side: "Which has higher median rent: Denver County, CO or
  Philadelphia County, PA?" Tap one. Reveal both numbers with their ranges. Five a day (daily mode, same for
  everyone) and an endless streak mode for the bus.
- **Share grid.** `Mapwich Higher/Lower #42 🟩🟩🟥🟩🟩 4/5`.
- **Dive deeper.** Each answer card links to `/compare/<a>/<b>?d=<dataset>`, the compare page that already exists.
- **Generation and checks.** Pick a dataset and two places (states, counties, or one well-known county vs
  a neighbor). Keep only pairs where the gap beats the combined margin (about a quarter fail) and is not
  enormous (skip "Manhattan vs rural Kansas on density"). Difficulty = how close the two are, measured as
  a percentile gap. Both values must differ at displayed rounding.
- **Planners.** A neat "your county vs the next county over" icebreaker; a lesson on margins of error
  ("these two look different but statistically aren't" can be a bonus "it's a tie!" round).
- **Size.** S (≈100k). **Cost.** $0. **Fork?** No. **Builds on:** compare page, values files, `gradeEstimate`.

### Concept C: Guess the Map ("You Color It")

- **What a player sees.** A blank US map of states (or the counties of one state), and a question:
  "Where do commutes take longest?" Tap a state to cycle it through the map's five color shades; paint
  your guess. Press "Reveal": the real map slides in beside yours, with each state you got within one shade
  ticked. Score: "You got 34 of 50 within a shade."
- **Share grid.** A tiny 5×10 grid of the states in alphabetical order, colored right/close/off; or simply "34/50".
- **Dive deeper.** "Open this map" (`/map?d=<id>&lv=state`), and "Zoom into the surprises": the three places
  you were most wrong about, each a link.
- **Generation.** A dataset per day (or week) from a list of maps with a clear geographic pattern: at build
  time, keep datasets whose state or county map has strong spatial clustering (a standard measure, Moran's I),
  because "random-looking" maps are no fun to guess. Classes come from the same quantile breaks the map uses.
- **Why it's special.** It's the only concept where the *map itself* is the game, and it doubles as a real
  planning exercise (mental mapping at public meetings: "where do you think the problem is?").
- **Size.** M–L (≈275–450k): painting on a phone needs care. **Cost.** $0. **Fork?** No.
  **Builds on:** MapView, classify/ramps from `packages/design`.

### Concept D: Map Connections (four of a kind)

- **What a player sees.** 16 states (or well-known counties) as tiles. Find four groups of four that share
  a trait: "coldest Januaries", "most people working from home", "highest share of homes built before 1960",
  "most people over 65". Four mistakes allowed; groups light up in four colors.
- **Share grid.** The Connections-style colored rows, `Mapwich Connections #6`.
- **Dive deeper.** Each solved group's name links to its map; the end screen opens a Combination if two
  of the traits happen to be one.
- **Generation and checks.** Pick four datasets from different categories with low correlation to each
  other (insights.json has the numbers). For each, choose four places in its top 10% that are **not** in the
  top 10% of the other three; verify every tile fits exactly one group. Red herrings occur naturally (a place
  in the top 20% of another trait). Difficulty color by how well-known the trait is (climate easy, housing age hard).
- **Honest note.** Connections is fun because an editor plants clever misdirection; generated groups will be
  fair but plainer. A weekly cadence, with the generator offering five candidates and Robbie (or the lead)
  picking one in ten minutes, is the sweet spot. States work better than counties (people know them).
- **Size.** M (≈275k). **Cost.** $0. **Fork?** No. **Builds on:** values files, insights correlations.

### Concept E: Rank It

- **What a player sees.** Five places and one question: "Order these from highest to lowest median home
  value." Drag to sort. Submit; each position turns green (right), yellow (one off) or gray.
- **Share.** `Mapwich Rank #42 🟩🟩🟨🟨🟩`. **Dive deeper:** the map of that dataset with the five places outlined.
- **Generation.** Five places whose neighbors-in-order all differ beyond their margins. Same engine as Higher or Lower.
- **Size.** S (≈75–100k, or ≈50k on top of B). **Cost.** $0.

### Concept F: Know Your County (the ONS model)

- **What a player sees.** "How well do you know Hennepin County?" (picked by search, or the county the
  splash page already guesses). Eight questions, each a slider: "What share of workers here take transit?"
  Drag, submit, see the real number and the US figure. End score: "You know Hennepin County 74%."
- **Dive deeper.** The end screen *is* the place page (`/place/<geoid>`), with the eight answers highlighted.
- **Generation.** No daily puzzle: questions are drawn per place from the approved list, only reliable
  values, mixing "near the US average" and "stands out" facts. Different questions each play.
- **Who it's for.** Planners first among the game ideas: public open houses ("test yourself, then see the
  real numbers"), staff onboarding at an MPO or county, civics classes. The ONS version was embedded by
  councils; an embeddable `/play/know/<geoid>` link would do the same.
- **Size.** S–M (≈150k). **Cost.** $0. **Fork?** Not on its own (see Concept H).

### Concept G: Guess the Link (correlation guess)

- **What a player sees.** "In counties where more people work from home, do more people exercise?" A slider
  from "strongly less" to "strongly more". Then the scatter plot appears with the real relationship and
  the outliers named.
- **Dive deeper.** Opens the two-dataset (bivariate) map, `/map?d=<x>&b=<y>`, exactly as the splash questions do.
- **Generation.** Only insight pairs with status OK and no flags, never "too good to be true" pairs.
- **Size.** S (≈100k). **Cost.** $0. Teaches the planner's favorite caution: correlation is not cause.

### Concept H: Live quiz for meetings and classrooms

- **What a player sees.** A host (a planner at an open house, a teacher) opens a quiz on the big screen;
  people join from their phones with a 4-letter code; questions come from B, F or G about *this* county;
  answers show as a live bar chart, then the map.
- **Cost.** Supabase Realtime on the free tier (shared limits on connections and messages; enough for
  meetings of tens to a few hundred). **Size.** L (≈500k). **Fork candidate: yes.** Public-engagement tools
  (Mentimeter, Kahoot, Slido) are paid products; a "civic data quiz" for planning consultants and agencies is
  something people would pay for. On Mapwich it stays free and basic.

### Concept I: Specials "Guess first"

- **What a player sees.** At the top of a Special, two or three "before you read, guess" questions (a slider
  or a "draw the line" for a trend); the article reveals the answers in place.
- **Generation.** Hand-picked by the editor agent from the Special's own numbers script; Robbie approves them
  with the draft (no extra review step). **Size.** S (≈100k for the block once, then free per Special).
  Fits the 1–2 Specials/month goal and makes each Special stickier.

### Concept J: Change Detective

- **What a player sees.** "Which of these five counties' median rent grew the most from 2014 to 2024?" or a
  before/after map pair with "spot the region that changed".
- **Dive deeper.** The change map, `/map?d=<id>&since=2014&t=2024`.
- **Caution.** Real margins on change maps are parked (#188), so only use changes far larger than both
  periods' margins. **Size.** S–M. **Cost.** $0.

## 3. Pitfalls

### Sensitive topics: a games list Robbie approves once (needs Robbie)

A guessing game turns a number into a punchline. "Guess the county with the most diabetes" or "the
poorest county" invites stereotypes about the people who live there, often rural, Black, Native or Latino
communities. The registry already has `excludeFromInsights` for subjects kept out of playful pairings;
games need a stricter, explicit list. **Proposed default (for Robbie to edit once, then the generator
enforces it):**

| Tier | Rule | Datasets (draft) |
|---|---|---|
| **Play** | Any question, any framing. | Commuting (mode shares, commute time, leave before 7am, work from home, zero-vehicle households), housing costs and stock (rent, home value, owner costs, homes built before 1960, mobile homes, renters, vacancy, density), climate (temperatures, degree days, precipitation), age (median age, 65+, under 18), broadband and computers, job density, VMT per capita, bridges in poor condition, moved last year, veterans, FEMA expected losses by hazard. |
| **Clue only** | May appear as one clue among several or in a neutral "higher or lower"; never as the theme ("the poorest…", "the sickest…"), never as "worst". | Income and earnings, unemployment, labor force, education levels, rent and cost burden, overcrowding, uninsured, energy burden, Gini, air quality, TRI releases, foreign born, limited English, CDC PLACES preventive care (checkups, screenings, dentist). |
| **Never in games** | Kept out of every game. | Race and ethnicity shares (all `pct_*_nh`, `pct_hispanic_latino`, `pct_people_of_color`, `svi_minority`), poverty, child poverty, SNAP, public assistance, deaths (overdose, traffic fatalities), CDC PLACES health conditions and behaviors (obesity, diabetes, depression, mental distress, smoking, binge drinking, loneliness, food and housing insecurity, disability), SVI and CEJST disadvantage scores, single-parent families, 287(g). |

Also: no game ever names a place as "worst", and every answer card shows the number in context (rank, US
figure, margin) with a link to the full map, so the game ends in the data, not a joke. Flag for Robbie:
the tier names and the line between "clue only" and "never" are wording and judgment calls about people.

### Answer ambiguity

- **Duplicate names:** there are 30 Washington Counties. The guess box must always carry the state
  ("Washington County, MN"), which the existing search already does.
- **County equivalents:** Mapwich uses Connecticut's nine planning regions (geoids 09110–09190, not the old
  eight counties), Virginia's 38 independent cities, Alaska's 30 boroughs and census areas, Louisiana
  parishes, and Puerto Rico's municipios. Players will guess "Fairfield County, CT" and find it doesn't exist.
  Default: the answer pool is the 50 states and DC, minus Connecticut and Alaska for answers (still allowed
  as guesses); Puerto Rico in a later "hard" track. Explain in the help text.
- **Ties and rounding:** two values that look the same once rounded ("$1,200 vs $1,200") are never asked.
- **Statistical ties:** pairs whose margins overlap are skipped (about a quarter of random pairs, section 2);
  a deliberate "it's a statistical tie" round can teach margins instead.
- **Distance:** measured center to center; neighbors of a huge county can feel "close but far". Show
  "neighbor!" when the guess shares a border (adjacency is a build-time computation, PostGIS skill).

### Data vintage

- Every clue says its period ("2020–2024 survey estimate", "2023 climate normals"), like the map legend.
- Puzzles store their own numbers; a data refresh doesn't rewrite yesterday's puzzle or a shared result.
- The dive-deeper link opens today's map, which may show a newer number than the puzzle did. The end card
  says "Puzzle numbers: 2020–2024. The map may show newer data."

### Accessibility

- **Color is never the only signal.** Hot/cold uses words and distance numbers as well as color; the share
  grid uses shapes (⬛🟧🟨🟩📍 plus arrows) and has a plain-text version. Colors come from `packages/design`
  tokens, checked for color-blind safety, with a high-contrast option like Wordle's.
- **Screen readers:** emoji grids read as "green square, green square…". Offer "Copy as text" with a
  sentence ("Mapwich County 42: solved in 4 guesses"). Announce each hint in an `aria-live` region.
- **The map is a hint, not a requirement.** Every game is playable with the keyboard and without seeing
  the map; Concept C (painting a map) offers a list-of-states mode.
- **Reduced motion** respected for reveals.

### Phone first

- One thumb, portrait, 375 px wide; no hover; big tap targets; the guess box above the keyboard.
- Known trap: `useMedia` / `useIsPhone` are false on the first render even on a phone, so the game's layout
  must not depend on them for its first paint.
- The share button uses the phone's share sheet (Web Share API) with copy-to-clipboard as fallback.

### No accounts

- Streaks, today's progress and stats in `localStorage`, wrapped in try/catch, as Wordle did. Clearing the
  browser loses them; say so in the help text. No login, no email, nothing stored about the player.
- Optional later: anonymous totals ("38% solved it in 3") via one Supabase table with a row per finished
  game and no identifier. Free tier is ample; skip it in the first version.
- The answer sits in the page's JSON, so a determined player can peek. Wordle shipped the same way; fine.

### Other risks

- **Daily games die quietly.** Most Wordle clones get little traffic. A game is a reach experiment, not a
  guarantee; measure it (section 4) and be willing to park it.
- **Editorial voice.** Game copy (clue wording, end-card text) is site copy. Robbie's rule on copy for a
  cold visitor applies, and the sensitive-topic wording goes to him.
- **Scope creep.** Archives, leaderboards, accounts and multiplayer each double the size. Start without them.

## 4. Who plays, and how a game pulls people into the real maps

**Honest fit with the North Star.** Robbie's weekly use is the tie-break, and a game does little for it:
he won't need a quiz to find a number. Games serve the **public (second audience)** and the **portfolio**:
they bring new visitors who wouldn't open a data viewer, and they show a hiring manager something few GIS
portfolios have (content generated from 138 datasets, with statistical checks and an ethics list). Rank
them after planner features, as a reach bet.

**Who plays.**

| Group | Which games | Why |
|---|---|---|
| Daily-puzzle players (Wordle, Worldle crowd) | A, B, D | A new daily habit; the share grid spreads it. A county-level "Wordle for maps" seems not to exist (search found state and country versions only). |
| Geography and map fans (r/MapPorn, r/geography, GIS Twitter/LinkedIn) | A, C | The map is the hint and the reward. |
| Teachers and students (AP Human Geography, civics, statistics) | B, F, G, H | Free, no accounts, US data, teaches margins of error and "correlation isn't cause". |
| **Planners** | F, H, C, B | Public open houses and engagement events ("how well do you know your county?" on a tablet, then the real numbers); a meeting icebreaker; staff onboarding at an MPO or county; mental-mapping exercises (C). |
| Robbie | I, F | Specials get a "guess first" hook; a quick way to show Mapwich in a talk. |

**The funnel into the real maps.**

1. A shared grid or a link (`mapwich.org/play`) brings a visitor.
2. The game itself shows a little map and real numbers with their periods and margins.
3. The end card always has **one obvious next step**: the exact map, place or comparison behind the
   puzzle (`/place`, `/compare`, `/map?d=…&in=…`). Secondary: "tomorrow's puzzle", streak.
4. The map page opens in the state the puzzle implies (dataset, level, place in focus), so the visitor
   lands on something meaningful, not the default map.
5. The home page or splash gets a small "Today's puzzle" entry; the game page links back to the map.

**What to measure.** Plays per day, completion rate, and **click-through from the end card to a map page**
(the number that says games feed Mapwich rather than distract from it). Vercel Web Analytics pageviews
with a `from=play` URL parameter on dive-deeper links would show this without new tools (the URL parser
ignores unknown parameters; check before relying on it). A gate: if after two months fewer than ~10% of
finished games click through to a map, park new games and keep only what's cheap to run.

## 5. Recommendation and top 10

## Sources
