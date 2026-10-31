# Writing a Special

Each Special is one Markdown file in this folder (D-115). The file name is the web address:
`work-from-home-and-exercise.md` → `mapwich.org/specials/work-from-home-and-exercise`.
Use lower-case words joined by hyphens.

## The format (Robbie, 2026-10-02)

Every Special is:

- a **5–7 minute read** (about 1,150–1,600 words; the page shows the reading time at 230 words a minute,
  counting the text plus the titles and captions of the maps, charts and tables);
- **one main map** at the top (`datasets` and `at` in the frontmatter);
- **one or two focus maps** inside the text, each zoomed to a region that tells part of the story;
- **at least one chart or table** inside the text.

Every number in the text must come from Mapwich's data. Keep the script that computed them in
`apps/web/scripts/specials-numbers/<file name>.mjs` so anyone can rerun it. Facts from outside Mapwich
need a link to a public source.

A piece drafted by an AI agent says so in its byline: `author: "Drafted by Claude for Robbie King"`
(D-122). The page then shows the author line as written, without "By".

## The file

```markdown
---
title: Your headline
dek: One or two sentences on what the map shows and why it matters.
topic: Health
date: 2026-10-15
datasets: [pct_work_from_home, physical_inactivity]
pairing: pct_work_from_home__physical_inactivity
draft: true
---

Your text. Paragraphs are separated by a blank line.

## A subhead

More text, [a link](https://example.org), **bold**, *italic*, lists, and images:

![A closer look at the Upper Midwest](/specials/upper-midwest.png)
```

## Fields

| Field | Needed? | What it does |
|---|---|---|
| `title` | yes | The headline. |
| `dek` | yes | One or two sentences under the headline. |
| `topic` | yes | The small label above the headline (Health, Commuting, Climate…). |
| `date` | yes | Publication date, `YYYY-MM-DD`. Newest is the lead piece on the Specials page. |
| `datasets` | yes | One dataset id (a single-measure map) or two (the bivariate map). Ids are the file names in `data/registry/datasets/`. Both must have county data. |
| `pairing` | no | The Combination this grew from (its id, like `x__y`). Adds the "How they line up" box and the link back. |
| `at` | no | Where the map opens: `[longitude, latitude, zoom]`, e.g. `[-93.3, 45.0, 6]`. Leave it out for the whole country. "Open this map" uses it too. |
| `caption` | no | The line under the map. Without it, the page describes what's mapped. |
| `method` | no | Anything extra for "How this was made" (filters, years, exclusions). Markdown. |
| `image` | no | A thumbnail: a screenshot of the main map, 1200×630 px (so link previews and platforms don't crop it). Put the file in `apps/web/public/specials/` and write `/specials/name.png`. It shows on the Earlier Specials cards and in the map box while the live map loads. |
| `author` | no | Defaults to Robbie King. A piece an AI agent drafted says so: `"Drafted by Claude for Robbie King"`. |
| `draft` | no | `true` keeps it off mapwich.org. Drafts still show on Vercel previews and local builds, marked "Draft". |

## Maps, charts and tables inside the text

Put them between paragraphs as fenced blocks: three backticks and the kind (`map`, `chart`, `table` or
`callout`), the fields in the same `name: value` form as the frontmatter, then three backticks to close.
The numbers in charts and tables are computed from Mapwich's data when the site is built, so you never
type them in. Captions can use Markdown links and *italics*.

### A focus map

````markdown
```map
datasets: [pct_work_from_home, physical_inactivity]
at: [-79.4, 37.9, 6.1]
caption: "Virginia and West Virginia, by county. Same colors as the main map."
```
````

| Field | Needed? | What it does |
|---|---|---|
| `datasets` | yes | One dataset id or two (the bivariate map), as in the frontmatter. |
| `at` | yes | `[longitude, latitude, zoom]`. Longitude first, and negative in the U.S. Zoom 2–14. Copy it from the map's address bar (`at=`). |
| `level` | no | `county` (the default) or `tract`. Tracts work for one dataset that has tract data; a two-dataset map is always by county. |
| `caption` | yes | The line under the map. Say where it is and what to look for. |

Every focus map has its legend under it and an "Open in the full map" button.

### A callout

A highlighted box for one short passage, such as a definition. `text` is inline Markdown (links, bold, italics).

````markdown
```callout
text: |
  Noise infusion means making small, deliberate changes to published numbers.
```
````

### A chart: one measure across groups of counties

````markdown
```chart
type: bins
x: pct_work_from_home
y: physical_inactivity
groups: 10
title: "Fewer adults skip exercise in counties where more people work from home"
caption: "Optional note under the chart."
```
````

Sorts every county with both values by `x`, cuts them into `groups` equal groups (10 = tenths,
5 = fifths), and shows the average `y` in each as a bar. `stat: median` uses the median instead.
The chart is also a real table, so it reads out properly with a screen reader and fits a phone.

### Tables

A few named counties (FIPS codes, quoted), with a column per dataset (up to four):

````markdown
```table
type: counties
title: "Four Virginia counties"
counties: ["51013", "51107", "51071", "51035"]
columns: [pct_work_from_home, physical_inactivity, median_household_income]
```
````

The top or bottom counties by one dataset: `type: rank`, `by: <dataset>`, `order: top` (or
`bottom`), `n: 10` (up to 25), and `columns` as above.

How strongly datasets line up with one, two or three others (Spearman ρ across counties):

````markdown
```table
type: correlations
title: "What else lines up with skipping exercise"
rows: [pct_work_from_home, per_capita_income, pct_bachelors_plus]
with: [physical_inactivity, pct_work_from_home]
```
````

In any chart or table a dataset can name an earlier period from its timeline, like
`pct_work_from_home@2019` (the 2015–2019 estimates). Every dataset a block uses is cited under
"How this was made".

## Pipeline

Drafting, review and conversion follow one flow: the editor agent drafts in a shared Claude Doc, Robbie
edits and comments there, the editor runs the numbers check, and the lead converts the approved doc into
this Markdown format and posts a preview link. The checklist the lead copies into each editor brief is
[`BRIEF.md`](BRIEF.md).

The numbers check ties the figures in a piece to data and reports each as match, mismatch or rounding
problem; figures it can't tie are listed as "unverified, check by hand":

```
npm run check:special -- work-from-home-and-exercise
```

It needs no `.env.local`; it reads the same county values the site does from `https://tiles.mapwich.org`
(or `NEXT_PUBLIC_TILES_BASE_URL`). It exits 1 on a mismatch or rounding problem. Code: `scripts/check-special-numbers.mts`.
The block parser has unit tests (`npm test`, `apps/web/src/lib/special-blocks.test.ts`).

## Previewing

`npm run dev` checks the pieces and computes the charts when it starts. After editing a piece, restart
it (or run `npm run prepare:assets -w web`) to see the change.

## Publishing

1. Write the file with `draft: true` and open a PR. The Vercel preview shows the page.
2. When it reads right, change to `draft: false` (or delete the line) and merge.
3. To make the front-page map show this piece's map, set `special` (and `d`, `b`, `at`) in
   `apps/web/src/lib/landing.ts`. The Specials page then tags the map "On the map now".

The build checks every file: an unknown dataset, a dataset without county data, a pairing that isn't
published, a missing `image` file, a file name that matches a Combination, or a mistake in a map, chart or
table block (an unknown field or dataset, an `at` outside the U.S., a tract map of two datasets, an
unclosed block) stops the build with a message naming the file and the block.
