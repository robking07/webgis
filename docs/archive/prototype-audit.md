# Prototype audit (F9)

Each part of the prototype (tag `v0.1-prototype`, 2026-10-03) is marked **keep**, **harden** or **replace when touched**, with a reason you can check against the code as of 2026-10-05. Phase 0 additions (CI, guardrails, share cards, CSV, alerts) are new code and not audited here.

| Part (path) | Verdict | Why | Touched by | Note |
|---|---|---|---|---|
| Map wrapper (`apps/web/src/components/map/MapView.tsx`) | keep | The only file that imports MapLibre (481 lines, the largest component); covered by the e2e click-through at three sizes | 1.2, 1.7, S4 | Change-over-time maps (1.2) add layers here; keep MapLibre out of every other file |
| Map page brain (`components/Viewer.tsx`, `map-page/use*.ts`) | keep | Split into focused files in #23; 320 lines; e2e covers landing, filters, details | 1.1, 1.2, 1.7 | |
| URL state (`lib/url-state.ts`) | harden | 62 lines, no unit tests, one selected place per URL (`?d b at lv t`) | 1.1, 1.2, 1.5 | 1.1 needs two places in the URL; add round-trip tests when it does |
| Redesigned menus and panels (`DatasetMenus.tsx`, `map-page/*Panel.tsx`, `BottomSheet.tsx`) | keep | Newest prototype code (#35); `e2e/menus.spec.mjs` tests phone, laptop and monitor layouts | 1.7, 3.5 | |
| Details panel lookup (`map-page/DetailPanel.tsx` + `lib/supabase.ts` `fetchDetail`) | replace when touched | **Per visitor:** every state or county click queries Supabase `dataset_values` from the browser; tracts already read a static file (D-113), block groups read R2 | S1 | The static tract path (`values/tracts/<county>.json`) is the pattern to copy |
| Place profiles (`app/place/[geoid]`, `components/PlaceProfile.tsx`) | replace when touched | **Per visitor:** state and county pages make two Supabase queries (`fetchGeography`, `fetchDetail`); tract pages make one (`fetchDetail` reads tracts from static files, `lib/supabase.ts`); client-side fetch, nothing cached | S1, 1.1 | Names already come from static `geo/names.json`; geography (centroid, area) can too |
| Value loading (`lib/values.ts`) | keep | Static JSON per dataset and level, cached in memory; block groups already load from R2 via `NEXT_PUBLIC_TILES_BASE_URL` (D-124) | S2, 1.2 | Already has the R2 switch S2 needs; extend it to all levels |
| Static data files (`apps/web/public/data/`) | replace on schedule (S2, early Phase 1) | 3,816 JSON files, 286 MB tracked in git (largest 2.3 MB, `values/tracts/06037.json`); every re-export adds to history; served from Vercel's bandwidth | S2, S5 | Move to R2 and out of git; history already packs to ~80 MB. Until S2 lands, no task adds or refreshes JSON here (Robbie, 2026-10-05) |
| Generated JSON (`apps/web/src/generated/`) | harden | 6 files committed. `registry`, `glossary`, `specials.json` are rebuilt by `scripts/prepare.mts` on every build, so committing them only adds diff noise; `insights.json` (26k lines, 634 KB), `periods.json`, `layers.json` come from local ingest and must stay committed until ingest runs elsewhere | S2, 1.8 | Ignore the three build-time files the way `theme.css` already is |
| Design system (`packages/design`) | keep | 992 lines; every build runs the contrast and color-vision gate (`npm run build` runs `check:design`) | 1.2, 1.3, 1.7, S4 | No unit tests for `classify.ts` / `format.ts`; not linted (CI lints only `-w web`). Add tests when 1.3 changes formatting |
| Basemap style (`packages/design/src/style.ts`) | keep | 378 lines of tokens-driven style over OpenFreeMap; no ad hoc colors | S4 | S4 swaps the tile source, not the styling |
| Dataset registry (`data/registry/`) | keep | 60 YAML entries; zod-parsed on every build through `prepare.mts`, so a bad entry fails CI | 1.3, 2.4–2.6 | `registry:validate` (duplicate ids, ramp checks) isn't in CI; cheap to add |
| Ingest pipeline (`data/ingest/src/`) | harden | 25 files, 2,107 lines, no tests, not linted or type-checked in CI; runs only on Robbie's machine with `.env.local` | S1, S2, 1.2, 1.3, 2.x | Each roadmap task that adds a step should add a small fixture test for it |
| Tile build and publish (`ingest tiles`, `publish-tiles`, R2) | harden | tippecanoe runs locally; `data/tiles` isn't in git; the only written procedure is the `build-tiles` skill | G3, S2, 2.1, 2.2 | G3's rebuild drill is the test |
| Odd Pairings (`ingest/src/insights.ts`, `PairingReview.tsx`, `lib/approvals.ts`, `/specials/review`) | harden | Sound design: spuriousness checks, fingerprinted approvals, approvals read server-side and cached 1 h (not per visitor). No tests; captions call Claude at ingest | 1.8, 3.2 | |
| Specials (`content/specials/`, `lib/specials-load.mts`, `lib/special-blocks.mts`, `components/specials/`) | harden | Checked at build time; one draft piece; the 253-line block parser has no tests | 1.8, 3.2 | 1.8 should add parser tests before more pieces depend on it |
| Dataset directory (`app/data`, `app/data/[id]`) | keep | Fully static (`generateStaticParams`), reads only the registry and approvals cache | 1.6, 3.1 | |
| Place search (`lib/search.ts`, `SearchOverlay.tsx`, `public/data/geo/search.json`) | replace when touched | Downloads the whole 1.8 MB index on first search and filters in the browser; grows with every new place type | 2.3 | 2.1 adds metros and cities; plan the index format in 2.3 |
| Data table and scatter (`DataTable.tsx`, `Scatter.tsx`) | keep | Small (139 lines), works off already-loaded values; 1.4 CSV built on it cleanly | 1.1 | |
| Database schema (`supabase/migrations/`, `scripts/db-push.sh`) | keep | 4 migrations, row-level security, free tier (500 MB) | S1 | After S1 it serves only reviewers and approvals |
| Keep-alive cron (`app/api/keepalive`, `vercel.json`) | keep | One query a day so Supabase doesn't pause | S1 | Revisit after S1; a paused database would then break only reviewer sign-in |
| End-to-end tests (`apps/web/e2e/menus.spec.mjs`) | harden | The only app test: one 559-line file with a hand-rolled runner (not `@playwright/test`); ~10 min in CI | 1.1, 1.7, 3.3 | Split by feature when 1.1 adds compare tests |
| Data correctness (values, vintages, margins of error for the 60 datasets) | harden | No automated check that ingest output matches the source; checked by eye at intake | 1.3, S1, S2 | Add source-total checks per dataset as tasks touch them; the core of "compare reliably" |
| Unit tests (repo-wide) | harden | None: no test runner in any workspace; `test:guardrails` exists but isn't in CI | every task | S1 adds the test runner (review lead, 2026-10-05) |
| Skills and agents (`.claude/skills/`, `.claude/agents/`) | keep | `add-dataset` and `build-tiles` are the written procedure for the local pipeline | G3, F11 | The runbook should point to them, not copy them |
| Original spec and decisions (`docs/SPEC.md`, `docs/DECISIONS.md`) | keep | History; D-01 to D-99 are frozen; the roadmap and handbook govern now | none | `SPEC.md` should carry a header note saying so (F10) |

**Count:** 13 keep, 8 harden, 4 replace when touched.

**Top risks, in the order the roadmap reaches them**

- **G3 (Phase 0): ingest and tiles run only on one machine,** with no tests and no CI. G3's rebuild drill is the first real test of whether anyone (or any agent) can rebuild the data from the repo alone.
- **1.1 side-by-side places** builds on `PlaceProfile` and the details panel, both of which still query Supabase per view. Doing 1.1 before S1 would double the per-visitor database calls. Read from static files from the start.
- **1.3 reliability warnings and 1.2 change-over-time maps** change ingest output and formatting with no unit tests on either side (`data/ingest`, `classify.ts`, `format.ts`). A wrong number would show up only as a visual check.
- **S1 static click details:** until it lands, every state or county click and every place page hits the Supabase free tier from the browser. At 1,000 concurrent users that is the first thing to fail, and a paused or slow database breaks the details panel.
- **S2 data files to R2:** 286 MB of JSON lives in git and ships with every Vercel deploy. Each re-export grows the repo for good, and Vercel's free bandwidth carries every tract file. Holding off on re-exporting large files until S2 keeps that growth down.

**Review (review lead, 2026-10-05):** claims spot-checked; place-profile query count corrected, static data moved to "replace on schedule", data-correctness row added. Phase 1 reordered so features aren't built on data paths the phase replaces: S1 → S2 → 1.3 + 1.1 → 1.2.
