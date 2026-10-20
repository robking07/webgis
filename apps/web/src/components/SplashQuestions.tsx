"use client";
// The splash questions (issue #224): a blinking cursor types one question at a time, holds it, erases
// it and types the next, in random order. The question is a link to the map that helps answer it.
// Hovering or focusing it holds it on screen. Reduced motion: a short static list instead.
// Until content/splash/questions.yaml is approved, only /?splash=preview shows it (`fallback` otherwise).
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SplashQuestion } from "@/lib/splash-load.mts";
import { PLACE_ZOOM } from "@/lib/place";

type County = [geoid: string, name: string, lon: number, lat: number];
interface Shown { text: string; href: string }

const noop = () => () => {};
const TYPE_MS = 45, ERASE_MS = 18, HOLD_MS = 3200, GAP_MS = 700, LIST = 5;

/** The question as shown: "{county}" filled with a random county, the map centered on it. */
export function fill(q: SplashQuestion, counties: County[], rand = Math.random): Shown {
  if (!q.county) return { text: q.text, href: q.link };
  const [, name, lon, lat] = counties[Math.floor(rand() * counties.length)];
  return { text: q.text.replace("{county}", name), href: `${q.link}&at=${lon},${lat},${PLACE_ZOOM.county}` };
}

/** Indexes 0..n-1 in a fresh random order each round, never the same one twice in a row. */
export function shuffler(n: number, rand = Math.random) {
  let bag: number[] = [], last = -1;
  return () => {
    if (!bag.length) {
      bag = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (n > 1 && bag[0] === last) [bag[0], bag[1]] = [bag[1], bag[0]];
    }
    return (last = bag.shift()!);
  };
}

const LINK = "group outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current hover:text-[var(--ui-splash-ink)] focus-visible:text-[var(--ui-splash-ink)]";
// Phones can't hover: the underline and arrow show all the time there.
const LINE = "decoration-2 underline-offset-[0.2em] group-hover:underline group-focus-visible:underline [@media(hover:none)]:underline";
const ARROW = "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

export function SplashQuestions({ questions, approved, fallback }: { questions: SplashQuestion[]; approved: boolean; fallback: ReactNode }) {
  const preview = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get("splash") === "preview", () => false);
  const on = approved || preview;
  const [view, setView] = useState<{ q: Shown; n: number } | null>(null);
  const [list, setList] = useState<Shown[] | null>(null);
  const held = useRef(false);

  useEffect(() => {
    if (!on) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    import("@/generated/splash-counties.json").then((m) => m.default as unknown as County[], () => []).then((counties) => {
      if (!alive) return;
      const pool = questions.filter((q) => !q.county || counties.length);
      const pick = shuffler(pool.length);
      const next = () => fill(pool[pick()], counties);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setList(Array.from({ length: Math.min(LIST, pool.length) }, next));
        return;
      }
      let q = next(), n = 0, dir = 1;
      setView({ q, n });
      const step = () => {
        // Held (hovered or focused): don't erase; a half-erased question types back in.
        if (dir === -1 && held.current) {
          if (n === q.text.length) { timer = setTimeout(step, 250); return; }
          dir = 1;
        }
        n += dir;
        if (n === q.text.length) { dir = -1; setView({ q, n }); timer = setTimeout(step, HOLD_MS); return; }
        if (n === 0) { q = next(); dir = 1; setView({ q, n }); timer = setTimeout(step, GAP_MS); return; }
        setView({ q, n });
        timer = setTimeout(step, dir === 1 ? TYPE_MS : ERASE_MS);
      };
      timer = setTimeout(step, GAP_MS);
    });
    return () => { alive = false; clearTimeout(timer); };
  }, [on, questions]);

  if (!on) return fallback;
  const hold = (v: boolean) => { held.current = v; };
  const cursor = <span aria-hidden className="motion-safe:animate-[splash-blink_1.06s_steps(1)_infinite]">_</span>;
  return (
    <div className="w-full max-w-3xl text-left text-2xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ui-splash-tagline)" }}>
      {list ? (
        <ul className="space-y-4" aria-label="Questions to explore">
          {list.map((q) => (
            <li key={q.href + q.text}><a href={q.href} className={LINK}><span className={LINE}>{q.text}</span><span aria-hidden className={ARROW}> →</span></a></li>
          ))}
        </ul>
      ) : (
        // The full text is laid out from the start (the untyped part invisible), so lines never re-wrap while typing.
        <p className="min-h-[4lh] sm:min-h-[3lh]">
          {view ? (
            <a href={view.q.href} aria-label={view.q.text} className={LINK} data-splash-question
              onMouseEnter={() => hold(true)} onMouseLeave={() => hold(false)} onFocus={() => hold(true)} onBlur={() => hold(false)}>
              <span aria-hidden className={LINE}>{view.q.text.slice(0, view.n)}</span>{cursor}
              <span aria-hidden className="invisible">{view.q.text.slice(view.n)}</span>
              {view.n === view.q.text.length && <span aria-hidden className={ARROW}> →</span>}
            </a>
          ) : cursor}
        </p>
      )}
      {!approved && <p className="mt-10 text-sm">Draft · not approved</p>}
    </div>
  );
}
