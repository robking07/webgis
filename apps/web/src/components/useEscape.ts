import { useEffect, useRef } from "react";

/** Esc calls `onClose`. The window listener is added once and reads the latest `onClose` from a ref:
 *  re-adding it per render loses a real key press when an earlier Esc listener (the Viewer's) re-renders
 *  the page mid-dispatch, since a listener removed during dispatch isn't called (issue #405). */
export function useEscape(onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
