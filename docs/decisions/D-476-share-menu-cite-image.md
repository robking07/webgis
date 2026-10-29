# D-476 · Share becomes a menu: link, memo citation, map image

- **Date:** 2026-10-28
- **Status:** DEFAULTED (worker, for the lead)
- **PR:** #376

On the map page, Share now opens a three-item menu instead of copying at once: **Copy link**
("Share link" on touch screens with a share sheet), **Copy for my memo** and **Save image**
(issue #361). The compare page's Share is unchanged (one click copies the link). Nothing new sits
on the map at rest (D-25/D-26).

- **Memo citation**, one line: map title(s), place (the selected or framed place, if any), the
  period shown, then `Source:` the registry `source.citation` (each distinct one once, `;`-joined),
  `Mapped by Mapwich, <link to this view>, accessed <Month D, YYYY>.`
- **Image**: the WebGL canvas copied in the frame it renders (no `preserveDrawingBuffer`, so no
  cost to normal frames), drawn onto a 2D canvas with a title band (same title as the citation),
  the legend in the lower-left corner (class swatches and labels, no-data swatch, or the 3×3
  bivariate grid), and a footer with the source, access date and the boundary/basemap credits
  (OSM attribution is required). Colors come from the theme tokens; the font is the page's UI font.
- **Phones**: the image goes to the native share sheet when it accepts files (save to Photos,
  send), otherwise it downloads.

Alternatives seen: keep Share as one click and add a caret or separate buttons (more chrome on the
card); `preserveDrawingBuffer` (simpler, slows every frame); an HTML-to-image library (new
dependency; Safari taints canvases drawn from SVG `foreignObject`).
