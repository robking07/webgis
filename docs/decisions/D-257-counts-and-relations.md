# D-257 · Counts behind each map, margins of error, and how maps relate

- **Date:** 2026-10-09
- **Status:** DEFAULTED (worker, issues #156 and #154; file layout and sizes are technical; the
  wording of the labels and links is Robbie's to edit)
- **PR:** #157

**Problem.** Compare places (#117) needs the head counts behind a rate (people in poverty, not
only the percent), each place's share of the places above it (tract → county, state; county →
state; state → U.S.), and which maps belong together. The ingest downloaded the counts and dropped
them. Margins of error reached the browser only for the default period's tracts and block groups,
so the change map (#127, D-252) guessed earlier margins and couldn't test counties (#154).

**Decided.**

1. **Relationships file: `data/registry/relations.yaml`**, checked by `relations.ts` inside
   `npm run registry:validate`. Three parts:
   - `maps`: every registry map (128), with `group` (must equal its registry `category`) and,
     when the ingest publishes counts for it, `counts: { of, per }`, plain names for the numerator
     and denominator. A registry map with no entry fails validation (the hook for task 5).
   - `parts`: race and ethnicity (7 groups + "some other race (non-Hispanic)", `B03002_008`;
     people of color overlaps them, so it's not a member) and commute modes (6 + "taxi, motorcycle
     or another way", `B08301_016/017/020`). Members must share one ACS denominator.
   - `links`: 51 hand-picked pairs, each with a one-line reason.
   `ingest export` also writes `apps/web/src/generated/relations.json` (links both ways, each map's
   parts set) for the web.
2. **Which maps get counts** (`countsSpec`): ACS rates and densities (47 maps; medians, the Gini
   index and per-capita income have no additive count), the three 2020 Census maps, LODES jobs,
   FARS deaths (deaths a year and residents) and 287(g) agreements. CDC PLACES stays percentages
   only (Robbie's default). Overdose, NRI, LEAD, air quality and climate maps have none.
3. **File layout** (new keys only; every existing file is unchanged):
   - `values/<id>/[<stop>/]<level>.moe.json`: `{ geoid: moe }` for state, county and tract, at
     the default period and every earlier ACS period (block groups already had one, D-124). Same
     shape as the values file, so the change map loads it like `loadMoes`.
   - `values/<id>/{state,county}.counts.json`: `{ geoid: [numerator, its MOE, denominator, its MOE] }`
     (null where there is none; MOEs are the Census 90% margins, √Σ MOE² for sums).
   - `values/counts/{tract,block_group}/<county>.json`: `{ <series>: { <tract or tract+bg code>:
     row } }`, one file per county like `values/tracts/` (D-113), so a place needs one small fetch
     instead of a national file per map (a race chart would otherwise load 8 files of ~1 MB).
   - `values/<id>/[<stop>/]us.json`: `{ value, moe, counts }`. ACS uses the Census Bureau's own U.S.
     row (`for=us:1`, 50 states + DC); the others sum the states without Puerto Rico.
   - Remainders are series like maps: `values/<remainder id>/…` and a key in the count shards.
     Remainder = total − Σ members, so the parts add to 100% exactly; its MOE is the published
     margin of its own cells. On the national B08301 file the cells equalled the difference in
     every place.
   - Counts at the default period only (`shortcut:` in `acs.ts`); margins at every period.
4. **Running it: two new steps that touch nothing else.** `ingest counts` re-runs the ACS (both
   periods), 2020 Census, LODES, FARS and 287(g) ingests with every existing writer switched off
   (no database writes, no existing value files, no block tiles; the database is only read for
   land areas and geographies). `ingest publish-counts` uploads only files matching the new
   patterns (`isCountFile`), so it can't resend an existing file whatever state the rest of
   `data/tiles` is in. The #143 guard now also covers `values/counts/`: an upload that would drop
   a series a live shard holds is refused. Normal `ingest acs` and friends write the new files too,
   so later refreshes keep them current. Every new file, at every period, comes from the source
   download in that run, never from local value files, so it works on a checkout that lacks some
   live files (the earlier-year files of the original survey maps, 2026-10-09). On 2026-10-09 none
   of the new keys existed on R2 (spot-checked 404s), so the first upload only adds objects; uploads
   never delete. `export` now lists only level files in `periods.json`
   (stop folders also hold `.moe.json` and `us.json`).

**Sizes (gzipped, as stored on R2).** Measured on the real national B08301 table for 7 series:
tract shards 0.54 MB per series, block-group shards 1.33 MB, state + county 0.04 MB; tract margins
≈0.48 MB per map and period (Minnesota sample scaled to 85k tracts).

| New files | Count | Size |
| --- | --- | --- |
| Tract count shards (≈53 series) | 3,222 | ≈29 MB |
| Block-group count shards (≈44 series) | 3,222 | ≈59 MB |
| State and county counts, U.S. rows | ≈300 | ≈2 MB |
| Margins of error, state/county/tract, ≈150 map-periods | ≈450 | ≈75 MB |
| **Total** | **≈7,200** | **≈165 MB** |

R2 goes from about 4.1 GB to about 4.3 GB of the 10 GB free tier.

**Not changed.** The database, the existing value, tract-detail and click-detail files, and the
web app. The change map switches to the new margin files in a later UI task (#154's second half),
and Compare places reads the counts (#117).
