# D-546 · TIP projects on the map (Met Council)

- **Date:** 2026-10-31
- **Status:** DEFAULTED (worker; the lead confirms)
- **PR:** #446

Added "Planned road projects (TIP)": the Met Council's funded Twin Cities projects for 2027-2030, as a `features` line layer colored by total cost. Source: the Council's public TIP Final Data (MN Geospatial Commons / Council open data), download `gisdata.metc.state.mn.us/gisdata/Transportation/tip_final_data.zip`. License as published: public domain under the Minnesota Government Data Practices Act (Minn. Stat. ch. 13). Credit the Metropolitan Council.

Defaults taken:

- **Lines only (268 projects).** The data also has 129 point projects. The map has no point style for feature layers, and a point style is UI work, which a dataset PR may not include. Marked with a `shortcut:` in the registry entry.
- **Color by total cost**, five classes. Cost 0 in the source means "not listed": it is dropped from the click and draws in the lowest class. Alternative: color by year funded.
- **Facets:** project type and year funded.
- **Left out of the click:** agency, program and funding-source split (shouting capitals and codes). Cheap to add later.
- The legend caption ("segments, wider lines = higher road class") and the "Road segments" count noun are written for roads (AADT); they read slightly off for projects. Fixing that is UI code, so it is left for a follow-up.
- Annual replacement: the Council publishes a new TIP each year, so a re-vintage is a new URL and years in this entry.

## Amendments
