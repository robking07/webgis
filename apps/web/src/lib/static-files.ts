// Where the map's data files live (S2): values/, geo/ and details/ sit beside the boundary tiles on
// R2 (https://tiles.mapwich.org in production), not in the site's own folder, so a data refresh
// is an upload, not a code deploy. Locally the base is /tiles, the public/tiles link to data/tiles
// that scripts/prepare.mts makes, so dev and the e2e suite work offline.
export const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";

/** A data file's URL, e.g. staticUrl("geo/names.json"). */
export const staticUrl = (path: string) => `${TILES_BASE}/${path}`;
