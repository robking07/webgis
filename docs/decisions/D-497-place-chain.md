# D-497 · The place chain on a click, key numbers on place profiles

- **Date:** 2026-10-29
- **Status:** DEFAULTED (worker, issue #364, under the plan Robbie approved 2026-10-28; the lead decides)
- **PR:** #397

**The chain.** A click's details open with the places the spot sits inside, coarse first:
state › MPO › metro › county › city › tract (a tract only above a block group or block), as the
existing "Minnesota › Hennepin County" links. State, county and tract select and frame the place, as
before; a city, metro or MPO opens it the way search does (outlined, with its own numbers, D-475,
D-488). Metros read "… metro" or "… micro area" and MPOs "… (MPO)" unless the name already says MPO,
so a metro named for a city isn't mistaken for it. A county named like its state is listed once (D.C.); a city named like its metro (Duluth) keeps both.
Nothing new on the map; the chain is one wrapped line of small links in the panel that was already
there.

**How each link is found, from published files only** (`apps/web/src/lib/place-chain.ts`, no new data):

- **Metro:** the county's own point (search index) inside a metro outline (`areas/cbsa*.json`); metros
  are whole counties, so the county decides, not the spot. Candidates: metro rows whose bbox holds it.
- **MPO:** for a tract or finer, the clicked spot inside an MPO shape (`/mpo/<id>.json`; candidates by
  bbox). For a county, the region-totals half rule (D-488, `mpo/counties.json`): the MPO holding at
  least half its residents.
- **City:** the spot inside a city outline (`areas/place*.json`). City rows carry no bbox, so the
  candidates are same-state cities whose center is within 2 × √(land sq mi) + 2 miles, ranked by
  distance over that reach (so downtown Los Angeles finds Los Angeles, not Vernon), and the top 6
  are tested (`shortcut:` comment). CDPs have no outline (D-475), so unincorporated spots show no city.
- Any lookup that fails is left out, never guessed. A click costs up to about 8 small JSON fetches
  (1–5 kB each), all in parallel.

**Key numbers.** A place profile (`/place/<geoid>`: states, counties, tracts) opens with six numbers,
each with its 90% margin of error: Residents (the population map's published count), Median household
income, Median age, Median home value, Average commute time, Bachelor's degree or higher. All ACS
5-year, labels are the registry titles, one source line under them. A shaky estimate shows its
reliability title (D-222). No race or ethnicity number (brief).

**Not done:** a chain or key numbers on city and metro views (they have no profile page yet, D-475);
the chain on the place profile page; bboxes on city rows (would make the city lookup exact).

Lead: — · Ponytail: — · Outcome: pending review.
