# D-115 · Specials front page and piece pages (direction A); pieces are Markdown in the repo

- **Date:** 2026-10-01
- **Status:** DECIDED (Robbie)
- **PR:** #15
- **Follows:** D-34 (Specials follows direction A), D-31 (Insights renamed Specials)

**Decided (Robbie).** Build Specials from direction A on the "Mapwich Specials" design
canvas (https://claude.ai/artifact/DrtMo71xyiMaVQguLSm521: front page and piece page,
desktop and phone, with his six review comments applied) and merge it to production.
Pieces are **Markdown files in the repo**, chosen over Claude Docs and a Supabase table:
publishing is a PR with a Vercel preview, like data intake (D-32), with no new service.

**Built.**
- `apps/web/content/specials/<slug>.md`: frontmatter (title, dek, topic, date, datasets,
  optional pairing, at, caption, method, image, author, draft) plus the body. The format
  guide for Robbie is `content/specials/README.md`. `lib/specials.ts` loads them at build
  time and fails the build on an unknown dataset, a dataset without county values, an
  unpublished pairing, or a file name that would collide with a pairing URL.
- Drafts (`draft: true`) are left out when `VERCEL_ENV=production`; local builds and
  Vercel previews show them, tagged "Draft". One placeholder draft ships
  (`work-from-home-and-exercise.md`); its text is bracketed prompts for Robbie to write.
- `/specials`: the translucent "Specials" title, then the lead piece (topic and date,
  headline, summary, byline, "Read the piece" and "Open this map", "Data in this piece"
  with the pairing it started from) over its live map, then Earlier Specials (headline
  first, data and date, optional thumbnail), then Odd Pairings: the top six, with signal
  bars for strength (3 strong |ρ| ≥ 0.6, 2 moderate ≥ 0.4, 1 modest), a folded-map icon
  when the pattern is mostly regional (within-state |ρ| < 0.6 × |ρ|, the same rule as the
  captions), "Across N counties", the exact ρ only in the tooltip and screen-reader label,
  and a one-line key. With no published piece it opens straight on Odd Pairings.
- `/specials/<slug>`: the piece page (headline block, the map with "Open in the full
  map", the text beside "Data in this piece" and "How they line up", "How this was made"
  with full citations, More Specials). Odd Pairings keep their URLs at
  `/specials/<pair id>`; the full list with scatter plots and the held-back pairs moved
  to `/specials/pairings`.
- Maps in Specials are live (one dataset or a bivariate pair, by county), follow the
  theme, and use cooperative gestures (new `MapView` prop `cooperative`), so the page
  scrolls and zooming needs Ctrl/⌘ or two fingers. On phones the legend sits below the
  map instead of over it.
- Differences from the canvas: today's header (logo and Settings menu, D-34, D-35) and
  dark theme. All colors come from theme tokens; the canvas's amber "regional" icon uses
  the muted text token instead of a new color.

**Open.** Earlier Specials cards show a map thumbnail only when a piece sets `image`.
The landing map switches to a Special only when `special` is set in `lib/landing.ts`
(D-33, C4).
