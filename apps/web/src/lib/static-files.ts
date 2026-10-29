// Where the map's data files live (S2): values/, geo/ and details/ sit beside the boundary tiles on
// R2 (https://tiles.mapwich.org in production), not in the site's own folder, so a data refresh
// is an upload, not a code deploy. Locally the base is /tiles, the public/tiles link to data/tiles
// that scripts/prepare.mts makes, so dev and the e2e suite work offline.
export const TILES_BASE = process.env.NEXT_PUBLIC_TILES_BASE_URL || "/tiles";

/** A data file's URL, e.g. staticUrl("geo/names.json"). */
export const staticUrl = (path: string) => `${TILES_BASE}/${path}`;

const pause = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

/** fetch that tries once more, after a short pause, on a network error or a 5xx (R2 sometimes sheds load). 4xx is final. */
export async function fetchRetry(url: string, init?: RequestInit): Promise<Response> {
  try {
    const r = await fetch(url, init);
    if (r.status < 500) return r;
  } catch (e) {
    if (init?.signal?.aborted) throw e;
  }
  await pause();
  return fetch(url, init);
}

/** Run a PMTiles tile request, once more after a pause if the server answered 5xx or the network failed. */
export async function retryTile<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!(e instanceof TypeError || /Bad response code: 5/.test(String(e)))) throw e;
    await pause();
    return run();
  }
}
