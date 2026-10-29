"use client";
// A focused MPO's plans (#365, D-479): long-range plan, TIP, work plan and grants, one line each; a tap
// opens the source link, when Mapwich last checked it, Mapwich's kept copy and a Wayback snapshot.
// Only MPOs in public/mpo/plans.json (Minnesota's 8 for now) have one; any other shows nothing.
import { useEffect, useState } from "react";
import { loadMpoPlans, type MpoPlans, type PlanLink } from "@/lib/search";

const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const site = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const link = "text-primary underline-offset-2 hover:underline";
const out = (href: string, text: string) => <a href={href} target="_blank" rel="noopener" className={link}>{text}</a>;
// A catalog note writes a link as [text](https://…), so no raw URL shows.
const note = (s: string) => {
  const p = s.split(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/); // text, link text, url, text, …
  return p.map((t, i) => (i % 3 === 0 ? t : i % 3 === 1 ? <span key={i}>{out(p[i + 1], t)}</span> : null));
};

/** When it was checked, and the copies: "Checked on Oct 29, 2026 · Mapwich's copy (from x.org) · Wayback snapshot". */
function Copies({ l }: { l: PlanLink }) {
  const said = l.status === "cant-verify" ? ": the site blocks automatic checks; it may still work in a browser" : l.status === "dead" ? ": the link no longer works" : "";
  return (
    <p className="text-muted-foreground">
      {l.checked && `Checked on ${day(l.checked)}${said}`}
      {l.kept && <> · {out(l.kept, `Mapwich’s copy (from ${site(l.url!)})`)}</>}
      {l.wayback && <> · {out(l.wayback, "Wayback snapshot")}</>}
    </p>
  );
}

// Viewer keys it by MPO. Open on desktop; on phones it starts closed so it doesn't cover the map
// (`phone` is false on the first render, so a phone sees it close straight away).
export function MpoPlans({ mpo, phone }: { mpo: string; phone: boolean }) {
  const [plans, setPlans] = useState<MpoPlans | null>(null);
  useEffect(() => {
    let live = true;
    loadMpoPlans().then((p) => live && setPlans(p)).catch(() => {}); // shortcut: a failed file shows no plans, silently; say so if visitors hit it.
    return () => { live = false; };
  }, []);
  const docs = plans?.mpos[mpo];
  if (!docs) return null;
  return (
    <details open={!phone} data-mpo-plans="" className="wg-panel pointer-events-auto mt-1 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl px-3 py-2 text-xs">
      <summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Plans</summary>
      <div className="mt-1 max-h-[45vh] space-y-1 overflow-y-auto">{/* Saint Cloud's plan has 13 parts */}
        {Object.entries(plans.labels).map(([k, label]) => {
          const d = docs[k];
          if (!d.url) return <p key={k} data-plan={k}>{label}: <span className="text-muted-foreground">{d.note && note(d.note)}</span></p>;
          return (
            <details key={k} data-plan={k}>
              <summary className="cursor-pointer list-inside truncate rounded focus-visible:outline-2 focus-visible:outline-ring">
                {label} <span className="text-muted-foreground">· {d.title}</span>
              </summary>
              <div className="mt-0.5 space-y-0.5 pb-1 pl-3">
                <p>{out(d.url, d.title ?? label)}{d.date && <span className="text-muted-foreground">, {d.date}</span>}</p>
                <Copies l={d} />
                {d.parts?.map((p) => (
                  <div key={p.url} className="pl-2">
                    <p>{out(p.url!, p.title ?? "Part")}</p>
                    <Copies l={p} />
                  </div>
                ))}
                {d.note && <p className="text-muted-foreground">{note(d.note)}</p>}
              </div>
            </details>
          );
        })}
      </div>
    </details>
  );
}
