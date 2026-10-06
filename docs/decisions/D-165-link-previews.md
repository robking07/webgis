# D-165 · Link previews (issue #37)

- Share tags (Open Graph + Twitter `summary_large_image`) come from one helper, `lib/share-meta.ts`; `metadataBase` is https://mapwich.org in the root layout.
- Cards are generated 1200x630 PNGs from route handlers at `/og/{home,data/<id>,special/<id>,place/<geoid>}`, drawn by `lib/og-card.tsx` with light-theme tokens from `@webgis/design`. Home, dataset and Special cards are prerendered at build; place cards render on first request and use only the bundled names file. No database calls at share time.
- A Special with an `image` uses that thumbnail; otherwise the generated card.
- Map links: the dataset is in the query (`?d=`), so crawlers see it and the map link previews as that dataset. Only share tags change, never `<title>`. Place and zoom (`?at=`) are not reflected: the card is the dataset's, not a rendering of the view. Any state kept in the URL hash would be invisible to crawlers; today none is.
- Font is the built-in Geist of `next/og`, regular weight only.
- 2026-10-05, Robbie: plain branded card chosen (no color strip, no map image).
- Lead decision: future Special thumbnails should be 1200×630 so platforms don't crop them.
- Correction: the card font is Geist (next/og's built-in), not Noto Sans. Its space glyph rendered unevenly, so card text lays words out as flex items with a fixed gap.
- Amendment (issue #72): cards now use bundled Public Sans (regular and bold woff files in `apps/web/src/assets/fonts/`, SIL OFL, matching the site). This supersedes the Geist note above; the per-word flex and zero-width-joiner workaround is removed and titles and summaries are plain text.
