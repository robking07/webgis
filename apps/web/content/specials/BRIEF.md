# Drafting brief for a Special

The lead copies this into each editor brief and fills in the topic. Format reference:
`README.md` in this folder. Rules for all workers: `docs/handbook.md`.

**Topic / pairing / datasets to start from:** _(lead fills in)_
**Issue:** _(lead fills in)_

## Pipeline

1. **Draft in a Claude Doc** (shared with Robbie), not in the repo yet. Robbie edits and comments there.
2. **Run the numbers check** on the draft (below) and fix what it flags.
3. **The lead converts** the approved doc into the Markdown file (D-115) and posts a preview link.
   Robbie approves wording; the editor never publishes.

## Checklist

**Format** (D-122)
- [ ] 5 to 7 minute read: about 1,150 to 1,600 words, counting the titles and captions of maps, charts and tables.
- [ ] One main map (frontmatter `datasets`, `at`).
- [ ] One or two inline focus maps, each zoomed to a place that tells part of the story.
- [ ] At least one chart or table.
- [ ] Headline options (3) and a one-line dek, for Robbie to choose from.

**Sourcing**
- [ ] Registry datasets only (`data/registry/datasets/`). Need one that isn't there? Say so in your report; don't ingest it.
- [ ] Every number comes from Mapwich data. Keep the script that computed it in `apps/web/scripts/specials-numbers/<slug>.mjs`.
- [ ] Cite source and vintage for each dataset used (the page's "How this was made" box does this from the registry; name the vintage in the text where it matters, e.g. "ACS 2020-2024").
- [ ] Facts from outside Mapwich get a link to a public source. Anything you couldn't verify is marked, not guessed.

**Tone** (Q-4, `docs/DECISIONS.md`)
- [ ] Plain language, no fluff. Headline states the relationship ("Counties with more X tend to have less Y").
- [ ] No causal claims. Say what the map shows and can't show.
- [ ] Never mock places, groups or anyone's circumstances. Historical context needs a cited source.
- [ ] Flag every judgment-call sentence in the doc (comment or bracket) so Robbie can rule on it. Wording is his.

**Draft marker and byline**
- [ ] `draft: true` stays on. Never remove it.
- [ ] `author: "Drafted by Claude for Robbie King"` (D-122). It must never read as Robbie's writing.

**Numbers check**
- [ ] Write the piece's blocks (map, chart, table) in the doc as the Markdown block syntax, so the check can read them.
- [ ] Put the draft in `apps/web/content/specials/<slug>.md` in your worktree and run
  `npm run check:special -- <slug>`. It needs no `.env.local`; it reads values from
  `https://tiles.mapwich.org`.
- [ ] Zero MISMATCH and zero ROUNDING PROBLEM. Fix the text, not the check.
- [ ] Go through the UNVERIFIED list by hand (state values, within-state correlations, counts, ranges,
  outside facts). Say in the doc how each was verified (your computation script, or the source link).

**Converting to the file** (the lead does this; the editor makes it easy)
- [ ] Frontmatter as in `README.md`: `title`, `dek`, `topic`, `date`, `datasets`, optional `pairing`, `at`, `caption`, `method`, `author`, `draft: true`.
- [ ] Inline blocks as fenced code, kind then YAML:

  ````markdown
  ```map
  datasets: [dataset_a, dataset_b]
  at: [-79.4, 37.9, 6.1]
  caption: "Where it is and what to look for."
  ```

  ```chart
  type: bins
  x: dataset_a
  y: dataset_b
  groups: 10
  title: "A plain sentence stating the pattern"
  ```

  ```table
  type: counties        # or rank, or correlations (fields in README.md)
  title: "..."
  counties: ["51013", "51107"]
  columns: [dataset_a, dataset_b]
  ```
  ````

- [ ] `npm run build` passes (the build checks every field and block and stops with the file and line).

## Report back

PR link (draft, "Closes #N"), the numbers-check output pasted, the UNVERIFIED list with how each was
settled, headline options, judgment-call sentences, datasets you wished you had, token use, one lesson.
