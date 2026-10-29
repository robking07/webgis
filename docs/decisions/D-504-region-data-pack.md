# D-504 · Region data pack: one .xlsx per county, GEOID as text

- **Date:** 2026-10-29
- **Status:** DEFAULTED (worker, for the lead)
- **PR:** #404 (issue #370)

A county's place page (`/place/<5-digit geoid>`) gets an "Every map, by census tract" section at
the bottom (a "Tract data" link in the header jumps to it). One button downloads
`mapwich-tracts-<county>.xlsx`, built in the browser from the two files the page and details
panel already read: `values/tracts/<county>.json` (every map's tract value and margin) and
`geo/tracts/<county>.json` (tract names). No new data, no server, no dependency.

**File format: a small .xlsx, not CSV.** The file has to keep the GEOID's leading zero in Excel
*and* join in QGIS/ArcGIS. A bare CSV fails in Excel (01001020100 becomes 1001020100). The
`="01001020100"` trick fixes Excel but leaves `="…"` in the field for GIS, so the join breaks. A
QGIS `.csvt` sidecar fixes QGIS only, needs a second file, and Excel still drops the zero. An
.xlsx with GEOID as a text cell fixes both in one file: Excel shows text, and GDAL (which QGIS
uses) reads the column as String. Checked: Jefferson County, AL (01073) joins 189 of 189 tracts
to `cb_2024_01_tract_500k` on GEOID. `lib/xlsx.ts` is about 60 lines: inline-string cells (no
shared-strings table), a frozen header row, and a stored (uncompressed) zip with CRC-32.

**Layout.** Sheet "data": `GEOID`, `name`, then `<dataset id>` and `<dataset id>_moe` for every map
that has tract values in the county, in registry order. Ids are already `[a-z0-9_]`, so ArcGIS
doesn't rename the fields. Every map gets a `_moe` column, even one with no published margins, so
every county's file has the same columns. A blank cell means no value. Sheet "about": one row per
column with title, unit, period, source, citation, license and the map's /data link.

**How-to.** A collapsed "Join it to tract boundaries in QGIS or ArcGIS" note in the section names
the Census cartographic boundary file (`cb_2024_<state>_tract_500k`) or TIGER/Line tracts (2020 or
later) and says to join GEOID to GEOID, then save as a GeoPackage, because shapefiles cut field
names to 10 characters.

**2020 tracts only (lead review).** The pack is for joining to 2020 tract shapes, so it leaves out
any map whose headline stop is on 2010 tracts. That is the `boundaries: "2019"` that
`timelineStops` (data/registry/timeline.ts) gives a stop before 2020. Those maps' tract IDs are
2010 IDs, and where an ID repeats in 2020 the value would silently land on a different shape. No
registry entry has a dataset-level `boundaries` field. Today no map with tract values has a 2010
headline stop, so Hennepin keeps all 87 maps. The 2010-tract maps (food access and CEJST tracts,
D-284) are feature layers and were never in the tract files. The filter guards against a future
pre-2020 headline. Both the how-to and the "about" sheet say: "Maps drawn on 2010 tracts (e.g. food
access) are left out; download them from their map page."

**Limits.**
- County to tracts only. State to counties and MPO packs are follow-ups.
- The zip is stored, not deflated. Hennepin is 1.6 MB; the largest counties (Los Angeles, about
  2,500 tracts) are around 12 MB. Use `CompressionStream` if that becomes a problem.
- ArcGIS Pro reading of the .xlsx was not tested here (no ArcGIS). Its Excel support may need
  Microsoft's Access Database Engine on some installs.
