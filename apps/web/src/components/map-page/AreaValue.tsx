"use client";
// A searched city's or metro area's own published number for the map(s) on screen (issue #332):
// "Median household income, 2020–2024: $98,000 ±$1,900", its benchmarks and reliability, or a plain
// "Not published for metro areas" instead of borrowing a county's number.
import { formatEstimate } from "@webgis/design";
import { Benchmarks } from "../Benchmarks";
import { ReliabilityNote } from "./DetailPanel";
import type { AreaFile } from "@/lib/search";
import type { Dataset } from "@/lib/registry";

export function AreaValue({ datasets, code, kind, file }: { datasets: Dataset[]; code: string; kind: string; file: AreaFile | null }) {
  if (!file) return null;
  const metro = code.startsWith("cbsa");
  // Benchmarks: a city gets its state and the U.S.; a metro (often across states) the U.S. only.
  const geoid = metro ? "" : code.slice(5);
  return (
    <div className="wg-panel pointer-events-auto mt-1 w-80 max-w-[calc(100vw-1.5rem)] space-y-2 rounded-xl px-3 py-2" data-area-value="">
      {datasets.map((d) => {
        const got = file.v[d.id];
        if (!got) return <p key={d.id} className="text-sm text-muted-foreground">{d.title}: not published for {metro ? `${kind.toLowerCase()}s` : "cities and towns"}.</p>;
        const [value, moe] = got;
        const est = formatEstimate(value, moe, d.unit);
        return (
          <div key={d.id}>
            <p className="text-xs text-muted-foreground">{d.title}, {d.vintage.replace(/ \(.*\)$/, "")}</p>
            {value != null && (
              <p className="text-xl font-semibold tabular-nums">
                {est.value}
                {est.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{est.moe}</span>}
              </p>
            )}
            {value != null && <Benchmarks dataset={d} geoid={geoid} />}
            <ReliabilityNote dataset={d} geoid={geoid} value={value} moe={moe} />
          </div>
        );
      })}
    </div>
  );
}
