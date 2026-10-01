"use client";
// Phone bottom drawer with two snap points: "peek" (just the summary) and "full"
// (summary + everything below it). Swipe up/down on the handle or the summary to move
// between them; swiping down from peek closes it. The handle is also a button, so the
// drawer works with taps, keyboard and screen readers.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Always visible: what the drawer shows at peek height. Also a drag zone. */
  summary: ReactNode;
  /** Revealed when the drawer is swiped open. */
  children: ReactNode;
  onClose: () => void;
  label: string;
}

const DRAG_THRESHOLD = 40; // px of travel that counts as a deliberate swipe
const FULL_RATIO = 0.9;    // full height as a share of the map area
const PEEK_MAX = 0.55;

export function BottomSheet({ summary, children, onClose, label }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<"peek" | "full">("peek");
  const [heights, setHeights] = useState({ peek: 220, full: 600 });
  const [drag, setDrag] = useState<{ startY: number; startH: number; dy: number } | null>(null);
  /** A swipe also fires a click on release; this swallows that click. */
  const dragged = useRef(false);

  // Measure the summary so "peek" fits it exactly, and the parent for "full".
  useLayoutEffect(() => {
    const measure = () => {
      const parent = sheet.current?.parentElement?.clientHeight ?? 800;
      const peek = Math.min((peekRef.current?.offsetHeight ?? 200) + 28, parent * PEEK_MAX);
      setHeights({ peek, full: Math.max(parent * FULL_RATIO, peek) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (peekRef.current) ro.observe(peekRef.current);
    if (sheet.current?.parentElement) ro.observe(sheet.current.parentElement);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (snap === "peek" && sheet.current) sheet.current.querySelector("[data-sheet-scroll]")?.scrollTo({ top: 0 }); }, [snap]);

  const base = heights[snap];
  const height = drag ? Math.max(0, Math.min(heights.full, drag.startH - drag.dy)) : base;

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setDrag({ startY: e.clientY, startH: base, dy: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 6 && !(e.target as Element).hasPointerCapture?.(e.pointerId)) (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ ...drag, dy });
  };
  const onUp = () => {
    if (!drag) return;
    const { dy } = drag;
    dragged.current = Math.abs(dy) > 6;
    setDrag(null);
    if (dy < -DRAG_THRESHOLD) setSnap("full");
    else if (dy > DRAG_THRESHOLD) { if (snap === "full") setSnap("peek"); else onClose(); }
  };
  const dragProps = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <section ref={sheet} aria-label={label} data-snap={snap}
      className={`group absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t bg-popover shadow-[0_-8px_24px_rgb(0_0_0/0.18)] ${drag ? "" : "transition-[height] duration-200 ease-out"}`}
      style={{ height }}>
      <button type="button" aria-expanded={snap === "full"} aria-label={snap === "full" ? "Collapse details" : "Expand details"}
        onClick={() => { if (dragged.current) { dragged.current = false; return; } setSnap((s) => (s === "full" ? "peek" : "full")); }}
        className="flex w-full shrink-0 touch-none justify-center pb-1 pt-2.5 focus-visible:outline-2 focus-visible:outline-ring" {...dragProps}>
        <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
      </button>
      <div data-sheet-scroll className={`min-h-0 flex-1 px-4 pb-6 ${snap === "full" && !drag ? "overflow-y-auto" : "overflow-hidden"}`}>
        <div ref={peekRef} className={snap === "peek" ? "touch-none" : undefined} {...(snap === "peek" ? dragProps : {})}>{summary}</div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

/** True below Tailwind's md breakpoint. */
export function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setPhone(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return phone;
}
