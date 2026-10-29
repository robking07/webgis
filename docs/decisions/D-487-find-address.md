# D-487 · Find an address: Census geocoder pass-through, device-only Near me

- **Date:** 2026-10-29
- **Status:** DEFAULTED (worker, per the plan Robbie approved 2026-10-28)
- **PR:** #387 (issue #363)

**Address lookup.** A typed street address goes to `POST /api/geocode`, a Next.js route handler on
Vercel that forwards it to the Census Bureau's public geocoder (`locations/onelineaddress`,
benchmark `Public_AR_Current`; no key, $0). The route:

- validates at the boundary (`cleanAddress`: 5 to 200 characters of letters, digits, spaces and
  `.,'#&/-`), with an 8 s timeout;
- never logs or stores the address; it uses POST so the address isn't in a URL that request logs
  keep, and answers `no-store`;
- returns only the matched address and its point.

We call the `locations` endpoint, not `geographies`. The tract comes from the map's own tiles at that
point, the same lookup a tap uses. Reasons: `geographies` returned 502 for every request while this
was built, and one client-side lookup serves both the address search and Near me. The browser shows
a pin there and opens the details of the place drawn under it on the map already showing (the
anti-steering rule in `drafts/site-copy/wave3-wording.md` §(a)). On a county-only map that place is
the county.

The lookup runs only when the visitor picks "Find this address". Nothing is sent while they type.

**Near me (phones only).** The browser's geolocation gives the point, and the place under it comes
from the rendered tiles (`MapApi.pickAt`). The position is never sent to the geocoder or to any
server.

**"Topic in place".** "asthma in Duluth" offers one row: the first matching dataset and the first
matching place, from the existing search index.
