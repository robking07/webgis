# D-239 · FEMA National Risk Index: dollars per resident, $0 where a hazard can't happen

- **Date:** 2026-10-07
- **Status:** PROPOSED (worker defaults; Robbie to confirm at review)
- **PR:** #139 (issue #40)

The NRI (v1.20.0, December 2025) comes in as a new measure kind, `fema_nri`, read from FEMA's
public ArcGIS layers (no key). Choices made:

- **Lead with expected yearly loss per resident**, in dollars (FEMA's `EAL_VALT` or a hazard's
  `*_EALT`, divided by FEMA's own `POPULATION`). It's absolute and plain ("$356 a year per
  resident") where the risk score is a relative rank. FEMA's own loss *rates* (`ALR_*`) are split
  into buildings, people and crops with no combined rate, and are tiny fractions. The per-resident
  figure is Mapwich's division, and the entries say so (FEMA's terms forbid passing modified data
  off as FEMA's).
- **"Not Applicable" counts as $0.** A blank hazard loss rated "Not Applicable" (coastal flooding
  inland, hurricanes in the interior West) is shown as $0, not "No data", so most of the coastal
  flood map doesn't read as missing. Blanks rated "Insufficient Data" (Puerto Rico and the
  territories for wildfire, Alaska for heat waves) stay no data.
- **Tracts under 100 residents get no per-resident value.** Port, airport and park tracts with a
  handful of residents otherwise show up to $1.9 million per person (360 of 85,154 tracts).
- **Levels follow what FEMA publishes.** Loss maps: state (FEMA's state layer), county, tract.
  Risk score and social vulnerability: county and tract (no state rank exists). Community
  resilience: county only, because FEMA gives every tract its county's score.
- **Dollar formatting** shows cents below $10 (`$0.16`, not `$0`), for small per-resident hazard
  losses. Existing dollar datasets never go that low, so they're unchanged.
- The ingest stops if the layers' `NRI_VER` isn't the version the entries name, so a future
  FEMA release can't silently replace v1.20 values.
