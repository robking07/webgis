import type { Metadata } from "next";
import Link from "next/link";
import { browsePairings, FLAGGED, RULES, STRENGTH_WORD, type PairSort, type Strength } from "@/lib/insights";
import { approvedInsights } from "@/lib/approvals";
import { CATEGORIES, DATASET_BY_ID } from "@/lib/registry";
import { InsightCard } from "@/components/InsightCard";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";
import { PairingsKey } from "@/components/specials/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Odd Pairings · Specials · Mapwich" };

const STEP = 30;
const SORTS: Array<[PairSort, string]> = [["strongest", "Strongest first"], ["within", "Strongest within states"], ["az", "A to Z"]];
const STRENGTHS = ([3, 2, 1] as Strength[]).map((s) => [s, STRENGTH_WORD[s].toLowerCase()] as const);
const chip = "inline-flex min-h-8 items-center rounded-full border px-3 text-xs text-muted-foreground transition-colors hover:text-foreground aria-[current=true]:border-primary aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring";

type Params = { topic?: string; strength?: string; q?: string; sort?: string; n?: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Every approved Odd Pairing (issue #274): filter by topic, strength and dataset name, sorted, 30 at a
// time. Filters live in the URL so a view can be shared; the pairs held back sit at the bottom (D-115).
export default async function PairingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const p: Params = { topic: one(sp.topic), strength: one(sp.strength), q: one(sp.q)?.trim() || undefined, sort: one(sp.sort), n: one(sp.n) };
  const topic = CATEGORIES.includes(p.topic ?? "") ? p.topic : undefined;
  const strength = STRENGTHS.find(([, w]) => w === p.strength)?.[0];
  const sort = SORTS.find(([s]) => s === p.sort)?.[0] ?? "strongest";
  const shown = Math.max(STEP, Math.floor(Number(p.n)) || STEP);
  // Only cards Robbie approved (D-116).
  const published = await approvedInsights();
  const hits = browsePairings(published, { topic, strength, q: p.q, sort });
  const filtered = !!(topic || strength || p.q);

  // A link to this view with some filters changed; changing a filter starts the list again at 30.
  const href = (patch: Partial<Params>) => {
    const q = new URLSearchParams();
    const next: Params = { topic, strength: p.strength && strength ? p.strength : undefined, q: p.q, sort: sort === "strongest" ? undefined : sort, n: undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <>
      <SiteHeader current="specials" />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Link href="/specials" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">← Specials</Link>
        <header className="mb-6 flex max-w-2xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Odd Pairings</h1>
          <p className="text-muted-foreground">
            Pairs of datasets that line up across U.S. counties. <strong className="text-foreground">Correlation is not causation:</strong>{" "}
            two things that rise together often both follow a third, like how urban a place is. Each pair passed automatic checks for
            tiny samples, shared denominators, outlier-driven results and purely regional patterns, then was read and approved by hand.
          </p>
          <PairingsKey />
        </header>
        {published.length === 0 ? (
          <p className="text-muted-foreground">No pairs have been approved yet.</p>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3">
              <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {topic && <input type="hidden" name="topic" value={topic} />}
                {strength && <input type="hidden" name="strength" value={p.strength} />}
                <label htmlFor="pairings-q" className="sr-only">Dataset name</label>
                <Input id="pairings-q" type="search" name="q" defaultValue={p.q} placeholder="Dataset name, e.g. poverty" className="sm:max-w-xs" />
                <label htmlFor="pairings-sort" className="sr-only">Sort</label>
                <select id="pairings-sort" name="sort" defaultValue={sort} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
                  {SORTS.map(([s, label]) => <option key={s} value={s}>{label}</option>)}
                </select>
                <Button type="submit" variant="outline">Apply</Button>
              </form>
              <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-1.5">
                {[undefined, ...CATEGORIES].map((c) => (
                  <Link key={c ?? "all"} href={href({ topic: c })} aria-current={topic === c} scroll={false} className={chip}>{c ?? "All topics"}</Link>
                ))}
              </div>
              <div role="group" aria-label="Filter by strength" className="flex flex-wrap gap-1.5">
                {[[undefined, "any"] as const, ...STRENGTHS].map(([s, w]) => (
                  <Link key={w} href={href({ strength: s ? w : undefined })} aria-current={strength === s} scroll={false} className={chip}>{s ? STRENGTH_WORD[s] : "Any strength"}</Link>
                ))}
              </div>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {filtered ? `${hits.length.toLocaleString()} of ${published.length.toLocaleString()} pairings` : `${published.length.toLocaleString()} pairings`}
                {filtered && <> · <Link href={href({ topic: undefined, strength: undefined, q: undefined })} className="text-primary hover:underline">Clear filters</Link></>}
              </p>
            </div>
            {hits.length === 0 ? (
              <p className="text-muted-foreground">No pairings match. Try another topic or name.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {hits.slice(0, shown).map((i) => <InsightCard key={i.id} insight={i} />)}
              </div>
            )}
            {hits.length > shown && (
              <Link href={href({ n: String(shown + STEP) })} scroll={false}
                className="mt-6 flex h-12 items-center justify-center rounded-lg border bg-card text-[15px] font-semibold text-primary hover:bg-muted">
                Show more ({(hits.length - shown).toLocaleString()} left)
              </Link>
            )}
          </>
        )}
        <details className="mt-10 rounded-xl border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">Held back: {FLAGGED.length} pairs that failed a check</summary>
          <p className="mt-2 text-muted-foreground">
            Rules: at least {RULES.minN} counties; |ρ| ≥ {RULES.minAbsRho}; |r| ≤ {RULES.tooGoodR}; Pearson and Spearman within {RULES.pearsonSpearmanGap};
            the pattern must still hold within states (|ρ| ≥ {RULES.minWithinStateRho} after removing state averages); no shared denominators,
            source variables or model inputs; different categories.
          </p>
          <ul className="mt-3 space-y-1.5">
            {FLAGGED.map((i) => (
              <li key={i.id}>
                <span className="font-medium">{DATASET_BY_ID.get(i.x)?.title} × {DATASET_BY_ID.get(i.y)?.title}</span>{" "}
                <span className="tabular-nums text-muted-foreground">(ρ = {i.rho.toFixed(2)})</span>: <span className="text-muted-foreground">{i.flags.join("; ")}</span>
              </li>
            ))}
          </ul>
        </details>
        <SiteFooter />
      </main>
    </>
  );
}
