# D-335 · FEMA major disaster declarations, counted since 2000

PR #235, issue #169. Status: proposed (defaults below; Robbie may change the window or the types).

## Decision

One map, `fema_major_disasters` ("Major disaster declarations since 2000"), state and county, under
Environment and climate › Natural hazards. Source: OpenFEMA Disaster Declarations Summaries v2
(bulk CSV, no key). New measure kind `fema_declarations` (`data/ingest/src/femadisasters.ts`).

- **What counts:** distinct `disasterNumber` with `declarationType` = DR (major disaster), by
  `declarationDate` in 2000 or later. One declaration counts once per area, however many rows name it
  (Alaska often has several rows per county for school-district areas).
- **Why 2000:** county detail exists from 1964, but FEMA's records were typed into NEMIS after it
  launched in 1998, and from 2000 on almost every major disaster lists its counties (only 6 DR rows
  since 2000 name a whole state, all hazard-mitigation-only or American Samoa). A recent window also
  keeps counties comparable with each other and with today's thresholds. 26+ years is long enough to
  show a pattern.
- **Statewide and tribal-area rows** (county code 000) count toward the state only. A statewide row
  since 2000 is the hazard-mitigation program opened statewide, not every county being hit.
- **Tribal-government declarations** (`tribalRequest` = 1) are left out of both levels: they are
  declared to the tribe, not the state, and have no county. 93 rows since 2000.
- **Codes:** `FIPS_RENAMES` for renamed counties; old Alaska census-area codes FEMA still uses are
  counted toward each successor (Valdez-Cordova → Chugach + Copper River; Wrangell-Petersburg →
  Petersburg + Wrangell; Prince of Wales-Outer Ketchikan → Prince of Wales-Hyder). FEMA still files
  Connecticut under its pre-2022 counties, so Connecticut's planning regions get no value (the state
  value is fine). Island territories (Guam, USVI, CNMI, American Samoa, Palau/FSM/Marshall Islands) are
  not in our geography; Puerto Rico is.
- **COVID-19 stays in:** the 59 COVID-19 major disasters of 2020 (incident type Biological) named
  every county, so every county has at least 1 and none shows 0. They were real major disaster
  declarations; the coverage note says so. Dropping them is a one-line filter if Robbie prefers.
- **Zero is real:** every other county gets a value; none declared = 0.
- **No counts file** (`counts.json`) for now: the value is itself a count, and the counts output is
  being reworked in parallel. `countsSpec` can add `fema_declarations` later like `ddp_287g`.
- **Unit:** new `declarations` unit ("12 declarations"), like `agreements`.

## Not done

Emergency (EM) and fire management (FM) declarations, incident-type facets, and a year control.
