"use client";
import { useEffect, useState } from "react";
import { StatusState } from "@webgis/design/components";
import { Scatter } from "./Scatter";
import { DATASET_BY_ID } from "@/lib/registry";
import { loadValues, type Values } from "@/lib/values";
import type { Insight } from "@/lib/insights";

export function InsightCard({ insight }: { insight: Insight }) {
  const x = DATASET_BY_ID.get(insight.x)!, y = DATASET_BY_ID.get(insight.y)!;
  const [vals, setVals] = useState<[Values, Values] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    Promise.all([loadValues(x.id, "county"), loadValues(y.id, "county")]).then(setVals, () => setErr(true));
  }, [x.id, y.id]);
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <a href={`/specials/${insight.id}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ring">
        <h3 className="text-base font-semibold leading-snug">{insight.headline}</h3>
      </a>
      <p className="text-sm text-muted-foreground">{insight.caption}</p>
      <div className="aspect-[14/9]">
        {err ? <StatusState status="error" /> : vals ? <Scatter x={x} y={y} xv={vals[0]} yv={vals[1]} compact width={420} height={270} /> : <StatusState status="loading" />}
      </div>
      <Stats insight={insight} />
      <a href={`/specials/${insight.id}`} className="text-sm text-primary underline-offset-2 hover:underline">See the map →</a>
    </article>
  );
}

export function Stats({ insight }: { insight: Insight }) {
  return (
    <p className="text-xs text-muted-foreground">
      Spearman ρ = <span className="font-medium text-foreground tabular-nums">{insight.rho.toFixed(2)}</span>
      {" · "}Pearson r = <span className="tabular-nums">{insight.r.toFixed(2)}</span>
      {" · "}within states ρ = <span className="tabular-nums">{insight.withinState.toFixed(2)}</span>
      {" · "}n = <span className="tabular-nums">{insight.n.toLocaleString()}</span> counties
    </p>
  );
}
