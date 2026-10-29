# D-502 · MPO profile: the Plans block

- **Date:** 2026-10-29
- **Status:** DECIDED (worker defaults, for the lead to confirm)
- **PR:** #402 (issue #365, part B)

When an MPO is in focus (`mpo=`: search, a shared link, or the place chain), its panel shows the
area total (RegionTotal) and, for MPOs in the plan catalog (D-479), a **Plans** block.

- **Data:** the map reads `apps/web/public/mpo/plans.json`, keyed by MPO id, written from
  `data/registry/mpo-plans.json` by `npm run ingest -- mpo-plans` (at the end) or
  `npm run ingest -- export-mpo-plans` (after a hand edit). It keeps only what a visitor sees: title,
  url, date, note, checked, status, the kept copy's public URL and the Wayback URL; no http, type,
  bytes or sha256. A unit test fails if the file is out of date with the catalog.
- **Kept copies:** linked only for the files `publish-mpo-plans` uploads (PDF and Word), at
  `https://tiles.mapwich.org/plans/<file>`. Web pages rely on the Wayback link (D-479).
- **Layout:** one line per document (label and title); a tap opens the source link with its date,
  "Checked on <date>", Mapwich's copy (naming the source site), the Wayback snapshot, any parts and
  the note. `cant-verify` reads "the site blocks automatic checks; it may still work in a browser"; a missing page shows its note.
  The block is open on desktop and starts closed on phones so the map stays clear.
- **Links in notes:** a catalog note writes a link as `[text](https://…)`; the panel shows it as a
  link, so no raw URL is visible. A unit test rejects bare URLs in notes.
- **Wording (lead, 2026-10-29):** `cant-verify` reads "Checked on <date>: the site blocks automatic
  checks; it may still work in a browser."
- Lead hand-checked all 49 Minnesota links 2026-10-29: 47 ok, 2 can't verify (La Crosse).
- **Outside the catalog:** no Plans block at all. Another state = more catalog entries; no UI change.
