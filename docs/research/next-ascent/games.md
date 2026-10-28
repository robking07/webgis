# Games: a "Wordle for maps" and other ways to make map data playful

Research agent R8, 2026-10-27. Research only; not for merge. The lead harvests it.

Status: section 1 done.
Next: 2. Game concepts.

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

## 3. Pitfalls

## 4. Who plays, and how a game pulls people into the real maps

## 5. Recommendation and top 10

## Sources
