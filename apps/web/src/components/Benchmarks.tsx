"use client";
// "Minnesota 9.6% · U.S. 12.4%": the state and U.S. value beside a place's own (issue #288).
// Used by the place profile's rows and the map's details panel; shows nothing where there's neither.
import { useEffect, useState } from "react";
import { formatValue } from "@webgis/design";
import { loadBenchmarks, type Benchmark } from "@/lib/benchmarks";
import type { Dataset } from "@/lib/registry";

export function Benchmarks({ dataset, geoid, className = "" }: { dataset: Dataset; geoid: string; className?: string }) {
  const key = `${dataset.id}/${geoid}`;
  // Keyed, so a newly clicked place never shows the last one's benchmarks while its own load.
  const [got, setGot] = useState<{ key: string; rows: Benchmark[] } | null>(null);
  useEffect(() => {
    let live = true;
    loadBenchmarks(dataset, geoid).then((rows) => live && setGot({ key: `${dataset.id}/${geoid}`, rows }), () => {});
    return () => { live = false; };
  }, [dataset, geoid]);
  const rows = got?.key === key ? got.rows : [];
  if (!rows.length) return null;
  return (
    <p className={`text-xs text-muted-foreground tabular-nums ${className}`} data-benchmarks="">
      {rows.map((r) => `${r.label} ${formatValue(r.value, dataset.unit)}`).join(" · ")}
    </p>
  );
}
