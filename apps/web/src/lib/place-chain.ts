// The places a clicked spot sits inside (issue #364), coarse first: state › MPO › metro › county › city › tract.
// Built from files the site already publishes, no new data: the search index (states, counties, city
// and metro rows), metro and city outlines (areas/<code>.json), MPO shapes and mpo/counties.json.
import type { Geometry, Position } from "geojson";
import type { GeoLevel } from "@webgis/design";
import { fetchGeography } from "./details";
import { loadArea, loadMpoCounties, loadMpoShape, loadPlaceIndex, mpoById, placeByGeoid, toHit, type Bbox, type PlaceHit, type PlaceRow } from "./search";

const inBox = (b: Bbox | undefined, [x, y]: Position) => !!b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

/** Is the point inside a Polygon or MultiPolygon? Even-odd ray casting over every ring, so holes count as outside. */
export function pointIn(g: Geometry, [x, y]: Position): boolean {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let inside = false;
  for (const ring of polys.flat()) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Cities and towns in the state whose center is near enough to hold the point, likeliest first
 *  (distance over size, so a big city's far-off center beats a small neighbor's: downtown L.A.).
 *  shortcut: city rows carry no bbox, so "near" is 2 × √(land sq mi) + 2 miles from the center and only
 *  the likeliest 6 outlines are tested; a very long, thin city could be missed. Add bboxes to the rows if so. */
export function cityCandidates(rows: PlaceRow[], state: string, [lon, lat]: Position, max = 6): PlaceRow[] {
  const cos = Math.cos((lat * Math.PI) / 180);
  const reach = (r: PlaceRow) => Math.hypot((r[3] - lon) * 69 * cos, (r[4] - lat) * 69) / (2 * Math.sqrt(r[5]) + 2);
  return rows.filter((r) => r[2].startsWith("place" + state) && reach(r) < 1)
    .sort((a, b) => reach(a) - reach(b)).slice(0, max);
}

/** The first row (in order) whose outline holds the point; outlines load in parallel. Metros don't
 *  overlap, nor do cities. */
async function firstHolding(rows: PlaceRow[], pt: Position, shape: (r: PlaceRow) => Promise<{ g: Geometry; b?: Bbox }>) {
  const shapes = await Promise.all(rows.map((r) => shape(r).catch(() => null)));
  const i = shapes.findIndex((s) => s && (!s.b || inBox(s.b, pt)) && pointIn(s.g, pt));
  return i < 0 ? null : toHit(rows[i]);
}

/** Everything a place at `level` (clicked at lon/lat) sits inside, coarse first. Any lookup that
 *  fails is left out, never guessed. */
export async function placeChain(geoid: string, level: GeoLevel, lon?: number, lat?: number): Promise<PlaceHit[]> {
  if (level === "state") return [];
  const rows = await loadPlaceIndex();
  const state = placeByGeoid(rows, geoid.slice(0, 2));
  const county = placeByGeoid(rows, geoid.slice(0, 5));
  // Clicks always carry the spot; without one, the city and MPO of a finer place are left out.
  const spot: Position | null = lon != null && lat != null ? [lon, lat] : null;
  const inCounty = level !== "county";
  // Metros are whole counties, so the county's own point decides (no edge-of-outline doubt).
  const metro = county ? firstHolding(rows.filter((r) => r[2].startsWith("cbsa") && inBox(r[7], [county.lon, county.lat])), [county.lon, county.lat],
    (r) => loadArea(r[2])) : Promise.resolve(null);
  // A county counts in an MPO when at least half its residents are inside (the region-totals rule, D-488);
  // anything finer, by the spot itself.
  const mpo = inCounty
    ? spot ? firstHolding(rows.filter((r) => r[1] === "MPO" && inBox(r[7], spot)), spot, (r) => loadMpoShape(r[2]).then((g) => ({ g }))) : Promise.resolve(null)
    : loadMpoCounties().then((m) => {
      const id = Object.keys(m).find((k) => m[k].some(([c, s]) => c === geoid && s >= 0.5));
      return id ? mpoById(rows, id) : null;
    });
  const city = inCounty && spot ? firstHolding(cityCandidates(rows, geoid.slice(0, 2), spot), spot, (r) => loadArea(r[2])) : Promise.resolve(null);
  const tract = level === "block_group" || level === "block" ? fetchGeography(geoid.slice(0, 11)).then((t) => t && {
    name: t.name, kind: "Tract", geoid: t.geoid, level: "tract" as const, lon: t.lon, lat: t.lat, sqmi: t.aland_sqmi,
  }) : Promise.resolve(null);
  const soft = <T,>(p: Promise<T>) => p.catch(() => null);
  const [m, me, c, t] = await Promise.all([soft(mpo), soft(metro), soft(city), soft(tract)]);
  // A name already listed is dropped (D.C. is a state and a county by the same name).
  const short = (p: PlaceHit) => p.name.split(",")[0];
  return [state, m, me, inCounty ? county : null, c, t].filter((p, i, all): p is PlaceHit => !!p && all.findIndex((q) => q && short(q) === short(p)) === i);
}
