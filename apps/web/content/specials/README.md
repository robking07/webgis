# Writing a Special

Each Special is one Markdown file in this folder (D-115). The file name is the web address:
`work-from-home-and-exercise.md` → `mapwich.org/specials/work-from-home-and-exercise`.
Use lower-case words joined by hyphens.

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
| `pairing` | no | The Odd Pairing this grew from (its id, like `x__y`). Adds the "How they line up" box and the link back. |
| `at` | no | Where the map opens: `[longitude, latitude, zoom]`, e.g. `[-93.3, 45.0, 6]`. Leave it out for the whole country. "Open this map" uses it too. |
| `caption` | no | The line under the map. Without it, the page describes what's mapped. |
| `method` | no | Anything extra for "How this was made" (filters, years, exclusions). Markdown. |
| `image` | no | A thumbnail for the Earlier Specials cards: put the file in `apps/web/public/specials/` and write `/specials/name.png`. |
| `author` | no | Defaults to Robbie King. |
| `draft` | no | `true` keeps it off mapwich.org. Drafts still show on Vercel previews and local builds, marked "Draft". |

## Publishing

1. Write the file with `draft: true` and open a PR. The Vercel preview shows the page.
2. When it reads right, change to `draft: false` (or delete the line) and merge.
3. To make the front-page map show this piece's map, set `special` (and `d`, `b`, `at`) in
   `apps/web/src/lib/landing.ts`. The Specials page then tags the map "On the map now".

The build checks every file: an unknown dataset, a dataset without county data, a pairing that isn't
published, or a file name that matches an Odd Pairing stops the build with a message naming the file.
