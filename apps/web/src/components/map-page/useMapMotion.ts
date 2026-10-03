import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { MapApi } from "../map/MapView";

/** How long the map must be still before menus come back (ms). */
const SETTLE_MS = 500;
/** How often to check whether the gesture is over (ms). */
const POLL_MS = 200;

/** "The map wins while it moves" (issue #34): true from the first user gesture (pan, pinch,
 *  scroll) until the map has been still for SETTLE_MS. A finger held down mid-drag still counts as
 *  moving, so the menus don't pop back while someone pauses. */
export function useMapMotion(mapApi: RefObject<MapApi | null>) {
  const [moving, setMoving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    setMoving(true);
    const tick = () => {
      if (mapApi.current?.isMoving()) timer.current = window.setTimeout(tick, POLL_MS);
      else timer.current = window.setTimeout(() => setMoving(false), SETTLE_MS);
    };
    timer.current = window.setTimeout(tick, POLL_MS);
  }, [mapApi]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { moving, start };
}
