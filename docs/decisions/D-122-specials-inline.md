# D-122 · Specials: the format, maps and charts inside the text, and agent-drafted bylines

- **Date:** 2026-10-02
- **Status:** DECIDED (Robbie: the format; the byline and headline, 2026-10-02) / DEFAULTED (the syntax and build, by the worker)
- **PR:** #22 (issue #20)
- **Follows:** D-115 (Specials pages; pieces are Markdown in the repo)

**Decided (Robbie, 2026-10-02).** "Posts should be a 5-7 minute read with a main map, a focus map or two
in line and a non map visual like a chart or table." Every Special now follows that format, written into
`apps/web/content/specials/README.md`: 5–7 minutes at 230 words a minute (about 1,150–1,600 words,
counting the text and the titles and captions of its maps, charts and tables), one main map, one or two
focus maps in the text, at least one chart or table. He also asked for a first piece drafted by an agent,
complete, so he can judge the quality: `work-from-home-and-exercise.md`, `draft: true`.

**Defaulted: how maps, charts and tables go in the text.** Fenced blocks with YAML inside, the same
`name: value` form as the frontmatter:

```map
datasets: [pct_work_from_home, physical_inactivity]
at: [-79.4, 37.9, 6.1]
caption: "Virginia and West Virginia, by county."
```

`chart` has one type, `bins` (counties cut into equal groups by one measure, the average of another in
each, drawn as bars). `table` has `counties` (named FIPS codes), `rank` (top or bottom N by a dataset)
and `correlations` (Spearman ρ against one to three datasets). Any chart or table dataset can name a
timeline period (`pct_work_from_home@2019`).

Why this way: a fenced block is still plain Markdown (GitHub shows it as a code block, nothing breaks),
it reuses the YAML the frontmatter already uses, and the author names datasets and a computation instead
of typing numbers, so the numbers always match the data. Rejected: MDX (a new toolchain and JSX in prose
for a non-programmer), shortcodes in HTML comments (invisible and error-prone), and hand-typed chart data.

**How it is built.** `scripts/prepare.mts` (runs before every `dev` and `build`) now loads the pieces
(`src/lib/specials-load.mts`), checks every field and block, computes the charts and tables from
`public/data/values/<id>/county.json` and the names file, and writes `src/generated/specials.json`.
Pages import that file. Before this, the loader read `content/specials/` from inside the page, which
works at build time but not if a page is re-rendered on the server later (the Specials pages refresh
hourly for the Odd Pairing approvals, D-116) unless those files are traced into the function. Mistakes
stop the build with the file and line: an unknown field or dataset, an `at` outside the U.S., a tract
map of two datasets, an unknown timeline period, a missing `image` file, an unclosed block.
Charts are HTML tables with bars drawn in (readable on a phone, read correctly by screen readers, theme
colors only, so light and dark both work). Focus maps reuse `SpecialMap` (new `level` and `legendBelow`
props; tract allowed for one dataset with tracts). No change to `MapView`. "How this was made" now cites
every dataset the piece uses, not only the main map's. The thumbnail (`image`) also shows in the map box
while the live map loads. Every number in the piece is reproduced by
`apps/web/scripts/specials-numbers/work-from-home-and-exercise.mjs`.

**Bylines on agent-drafted pieces (the lead's default, kept by Robbie).** A piece an AI agent drafted
says so: `author: "Drafted by Claude for Robbie King"`, shown as written (no "By" in front), and its
"How this was made" box says it was drafted by Claude from Mapwich data. It must never read as if
Robbie wrote it. Robbie kept this wording on 2026-10-02 (amendment below).

**Open.**
- Kentucky and Pennsylvania have no county values for CDC PLACES no-leisure-time-exercise in Mapwich's
  data (120 and 67 counties), so they are blank on this piece's maps; the caption says so.
- After editing a piece, `npm run dev` has to be restarted (or `npm run prepare:assets -w web` run) to
  see the change, since the pieces are now compiled before the app starts.

**Amendment (2026-10-02, Robbie).** Byline "Drafted by Claude for Robbie King" kept for agent-drafted
pieces; headline kept; the Todd/Oglala Lakota passage adds cited historical context (colonialism,
federal policy) per Robbie: "Yes add context. It's obvious hundreds of years of oppression by the US
government us a stronger reason why native communities have poor health. They have been economically
depressed because of colonialism". Sources: Oglala Lakota County, the Bureau of Indian Affairs (Rosebud
Agency), *United States v. Sioux Nation of Indians* (1980), and the U.S. Commission on Civil Rights,
*Broken Promises* (2018). The piece is now 1,596 words, a 7-minute read.
