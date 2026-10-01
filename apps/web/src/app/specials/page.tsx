import type { Metadata } from "next";
import { FLAGGED, PUBLISHED, RULES } from "@/lib/insights";
import { DATASET_BY_ID } from "@/lib/registry";
import { InsightCard } from "@/components/InsightCard";
import { SiteFooter } from "@/components/SiteNav";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Specials · Mapwich" };

export default function SpecialsPage() {
  return (
    <>
    <SiteHeader current="specials" />
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Specials</h1>
      <header className="mb-6 max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight">Odd Pairings</h2>
        <p className="mt-1 text-muted-foreground">
          Pairs of datasets that line up across U.S. counties. <strong className="text-foreground">Correlation is not causation:</strong>{" "}
          two things that rise together often both follow a third, like how urban a place is. Each pair passed automatic checks for
          tiny samples, shared denominators, outlier-driven results and purely regional patterns before it got here.
        </p>
      </header>
      {PUBLISHED.length === 0 ? (
        <p className="text-muted-foreground">No pairs have passed the checks yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLISHED.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
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
