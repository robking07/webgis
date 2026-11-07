"use client";
// The dataset page's key numbers (issue #244): the U.S. value, the top three states and cities of
// 100,000+ in the map's own direction, and full sortable tables of each, shown when asked for.
import { useEffect, useState } from "react";
import { formatEstimate, isGradable } from "@webgis/design";
import { NO_BENCHMARK, US_KINDS } from "@/lib/benchmarks";
import { rankOrder, topThree, type Row } from "@/lib/key-numbers";
import { loadMoes, loadValues, type Values } from "@/lib/values";
import { fetchRetry, staticUrl } from "@/lib/static-files";
import type { Dataset } from "@/lib/registry";

type Props = { dataset: Dataset; stateNames: Record<string, string>; cities: Row[] };

export function DatasetKeyNumbers({ dataset: d, stateNames, cities }: Props) {
  const [states, setStates] = useState<Row[] | null>(null);
  const [us, setUs] = useState<{ value: number; moe: number | null } | null>(null);
  const [open, setOpen] = useState<"states" | "cities" | null>(null);
  const graded = isGradable(d.measure.kind);
  const order = rankOrder(d);

  useEffect(() => {
    let live = true;
    // Key numbers are an extra: a failed file hides its part, never the page.
    Promise.all([loadValues(d.id, "state"), graded ? loadMoes(d.id, "state").catch((): Values => ({})) : {} as Values])
      .then(([v, m]) => Object.entries(v).flatMap(([g, value]) => stateNames[g] ? [{ name: stateNames[g], value, moe: m[g] ?? null }] : []), () => [])
      .then((rows) => live && setStates(rows));
    if (US_KINDS.has(d.measure.kind) && !NO_BENCHMARK.has(d.unit)) {
      fetchRetry(staticUrl(`values/${d.id}/us.json`)).then((r) => (r.ok ? r.json() : null))
        .then((u: { value?: number | null; moe?: number | null } | null) => live && u?.value != null && setUs({ value: u.value, moe: u.moe ?? null }), () => {});
    }
    return () => { live = false; };
  }, [d, graded, stateNames]);

  if (!states?.length) return null;
  const word = order === "low" ? "Lowest" : "Highest";
  const st = order && topThree(states, order, graded);
  const ct = order && cities.length > 0 ? topThree(cities, order, true) : null;
  const skipped = (st?.skipped ?? 0) + (ct?.skipped ?? 0);
  const est = (r: { value: number; moe: number | null }) => {
    const e = formatEstimate(r.value, r.moe, d.unit);
    return <>{e.value}{e.moe && <span className="ml-1 text-xs font-normal text-muted-foreground">±{e.moe}</span>}</>;
  };

  return (
    <section aria-labelledby="key-numbers" className="mb-8">
      <h2 id="key-numbers" className="sr-only">Key numbers</h2>
      <div className="grid gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2">
        {us && (
          <div className="sm:col-span-2">
            <h3 className="text-xs text-muted-foreground">U.S.</h3>
            <p className="mt-1 text-lg font-semibold tabular-nums">{est(us)}</p>
          </div>
        )}
        {st && <Top3 title={`${word} states`} rows={st.top} est={est} />}
        {ct && <Top3 title={`${word} cities of 100,000+ people`} rows={ct.top} est={est} />}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {graded && "± is the 90% margin of error. "}
        {skipped > 0 && `Leaves out ${skipped} ${skipped === 1 ? "estimate" : "estimates"} too uncertain to rank. `}
        {cities.length > 0 && "Cities: incorporated places with 100,000 or more people in the Census Bureau’s 2024 estimates."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <TableButton which="states" open={open} setOpen={setOpen} />
        {cities.length > 0 && <TableButton which="cities" open={open} setOpen={setOpen} />}
      </div>
      {open && <RankTable id={`table-${open}`} label={open === "states" ? "State" : "City"} rows={open === "states" ? states : cities} title={d.title} est={est} />}
    </section>
  );
}

type Est = (r: Row) => React.ReactNode;

function Top3({ title, rows, est }: { title: string; rows: Row[]; est: Est }) {
  return (
    <div>
      <h3 className="text-xs text-muted-foreground">{title}</h3>
      <ol className="mt-1 space-y-0.5">
        {rows.map((r, i) => (
          // #1 larger and bold, #2 and #3 smaller and regular (Robbie, #244).
          <li key={r.name} className={`flex flex-wrap items-baseline justify-between gap-x-3 ${i === 0 ? "text-lg font-semibold" : "text-sm"}`}>
            <span>{r.name}</span><span className="whitespace-nowrap tabular-nums">{est(r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TableButton({ which, open, setOpen }: { which: "states" | "cities"; open: string | null; setOpen: (w: "states" | "cities" | null) => void }) {
  return (
    <button type="button" aria-expanded={open === which} aria-controls={`table-${which}`} onClick={() => setOpen(open === which ? null : which)}
      className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      View table of all {which}
    </button>
  );
}

/** Every state or city with its value, sortable by name or value (a 52- or 341-row list, so no windowing). */
function RankTable({ id, label, rows, title, est }: { id: string; label: string; rows: Row[]; title: string; est: Est }) {
  const [sort, setSort] = useState<{ col: "name" | "value"; desc: boolean }>({ col: "value", desc: true });
  const dir = sort.desc ? -1 : 1;
  const sorted = [...rows].sort((a, b) => (sort.col === "name" ? dir * a.name.localeCompare(b.name) : dir * (a.value - b.value)));
  const th = (col: "name" | "value", text: string) => (
    <th scope="col" aria-sort={sort.col === col ? (sort.desc ? "descending" : "ascending") : "none"} className={`sticky top-0 bg-card px-3 py-2 font-medium ${col === "value" ? "text-right" : "text-left"}`}>
      <button type="button" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setSort((s) => ({ col, desc: s.col === col ? !s.desc : col !== "name" }))}>
        {text}{sort.col === col ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
  return (
    <div id={id} className="mt-3 max-h-96 overflow-auto rounded-xl border">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{title} by {label.toLowerCase()}</caption>
        <thead><tr>{th("name", label)}{th("value", "Value")}</tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.name} className="border-t">
              <th scope="row" className="px-3 py-1.5 text-left font-normal">{r.name}</th>
              <td className="whitespace-nowrap px-3 py-1.5 text-right">{est(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
