# D-580 · FEMA major disaster declarations: since 2000, and by decade back to the 1960s

PR #480, issue #169. Carries over D-335 (PR #235, closed when the issue was parked on 2026-10-27;
its file lived only on branch `data/fema-disasters`). Un-parked by Robbie on 2026-11-01 ("unpark new
data and data.gov sweep… I want to have analysis over time run back as far as possible").

## Decision

One map, `fema_major_disasters` ("Major disaster declarations"), state and county, under
Environment and climate › Natural hazards. Source: OpenFEMA Disaster Declarations Summaries v2
(bulk CSV, no key). Measure kind `fema_declarations` (`data/ingest/src/femadisasters.ts`).

- **Headline: since 2000** (unchanged from D-335). Distinct `disasterNumber` with
  `declarationType` = DR (major disaster), by `declarationDate` in 2000 or later. One declaration
  counts once per area, however many rows name it (Alaska often has several rows per county for
  school-district areas). Why 2000: FEMA's records were typed into NEMIS after it launched in 1998,
  from 2000 on almost every major disaster lists its counties, and a recent window keeps counties
  comparable under today's thresholds.
- **New: a decade at a time back to the 1960s** (lead, 2026-11-01: history as far back as the
  source honestly allows). `timeline: { from: 1960, to: 2020, step: 10 }`; stops `1960s` … `2020s`
  (calendar decades), with "Since 2000" as the default stop, last, like FARS' average. County detail
  starts in 1964, so 1960–63 declarations count toward the state only (the 1950s have one county row
  in total, so no 1950s stop). The 2020s are the decade so far. The stops are written by the same
  `fema-disasters` step (no separate `timeline` step; it is the same file).
- **No change maps.** Stop ids aren't four-digit years, so `changeStops` offers none: a count over
  a partial decade, or under thresholds that moved, doesn't make an honest "change".
- **Breaks** `[3, 6, 10, 15]` (were `[5, 8, 12, 17]`): the year control keeps the default's breaks,
  and these read for both the 26-year count (county 20th/40th/60th/80th percentiles 4/6/9/12) and a
  decade (2010s: 1/2/3/5, max 11).
- **Statewide and tribal-area rows** (county code 000) count toward the state only.
- **Tribal-government declarations** (`tribalRequest` = 1) are left out of both levels: declared to
  the tribe, not the state, with no county.
- **Codes:** `FIPS_RENAMES` for renamed counties; old Alaska census-area codes count toward each
  successor (Valdez-Cordova → Chugach + Copper River; Wrangell-Petersburg → Petersburg + Wrangell;
  Prince of Wales-Outer Ketchikan → Prince of Wales-Hyder). No other retired county codes appear in
  any decade (checked 2026-11-01). Connecticut's planning regions get no value (FEMA files it under
  its old counties); island territories other than Puerto Rico aren't in our geography.
- **Pandemic declarations left out** (Robbie, 2026-10-14): `incidentType` Biological (the 2020
  COVID-19 major disasters named every county).
- **Zero is real:** every other county gets a value; none declared = 0.
- **Runs on GitHub:** `fema-disasters` is allowed in `check-run.ts` (no key, no GDAL).
- **Unit:** `declarations` ("12 declarations").

## Sanity check (2026-11-01 file, 70,599 rows = OpenFEMA `recordCount`)

2024: 100 distinct major disasters, DR-4753 (Rhode Island, declared Jan. 7, 2024) to DR-4852 (North
Dakota, Dec. 24, 2024), with no gaps; FEMA's pages confirm both ends and that DR-4853 was declared
Jan. 1, 2025. 13 of the 100 were requested by tribal governments, so 87 count here.
Major disasters counted per decade: 1960s 184, 1970s 328, 1980s 237, 1990s 460, 2000s 560,
2010s 578, 2020s so far 381.

## Not done

Emergency (EM) and fire management (FM) declarations, incident-type facets, a 1950s state-only stop,
the list of declarations in click details.
