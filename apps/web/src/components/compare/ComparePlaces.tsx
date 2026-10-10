"use client";
// Two places side by side (roadmap 1.1, issue #117). Leads with the metric the visitor was viewing,
// in large type, then the rest of that metric's topic group; other topics fold behind "More topics".
// Every number comes from the same static files as the details panel and place pages
// (details/<state>.json, values/tracts/<county>.json; lib/details.ts), so no database call.
import { useEffect, useMemo, useState } from "react";
import { formatValue, isGradable, type GeoLevel } from "@webgis/design";
import { StatusState } from "@webgis/design/components";
import { bothHave, compareValues, rowVerdictText, shortName, verdictText, type Verdict } from "@/lib/compare";
import { fetchDetail, fetchGeography, type Detail } from "@/lib/details";
import { levelOfGeoid, PLACE_ZOOM, placeHref, rankText } from "@/lib/place";
import { DATASET_BY_ID, DATASETS, type Dataset } from "@/lib/registry";
import { loadValues } from "@/lib/values";
import { serializeUrlState } from "@/lib/url-state";

interface Props { a: string; b: string; nameA: string; nameB: string; datasetId: string }

const LEVEL_WORD: Partial<Record<GeoLevel, string>> = { state: "states", county: "counties", tract: "Census tracts" };

export function ComparePlaces({ a, b, nameA, nameB, datasetId }: Props) {
  const level = levelOfGeoid(a)!;
  const ds = DATASET_BY_ID.get(datasetId)!;
  const [data, setData] = useState<{ a: Detail; b: Detail; back: string } | null>(null);
  const [err, setErr] = useState(false);
  const [ranks, setRanks] = useState<{ a: string | null; b: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchDetail(a), fetchDetail(b), fetchGeography(a).catch(() => null)]).then(([da, db, geo]) => {
      if (!live) return;
      const back = `/map${serializeUrlState({ d: ds.id, b: null, theme: null, lv: null,
        at: geo ? { lon: geo.lon, lat: geo.lat, zoom: PLACE_ZOOM[level] } : { lon: -96.5, lat: 38.5, zoom: 3.6, fit: true } })}`;
      setData({ a: da, b: db, back });
      // Ranks for the lead metric only (one values file, ~15 KB gzipped for counties).
      // shortcut: no tract ranks; the national tract file is too big for a phone. Upgrade if a per-state tract export appears.
      if (level !== "tract" && ds.geographyLevels.includes(level)) {
        loadValues(ds.id, level).then((vals) => live && setRanks({ a: rankText(vals, da[ds.id]?.value, level), b: rankText(vals, db[ds.id]?.value, level) }), () => {});
      }
    }, () => live && setErr(true));
    return () => { live = false; };
  }, [a, b, ds, level]);

  const names = { a: shortName(nameA), b: shortName(nameB) };
  const groups = useMemo(() => {
    if (!data) return null;
    // Only datasets with a value for both places (Robbie: show only what works for the feature).
    const has = (d: Dataset) => bothHave(data.a[d.id], data.b[d.id]);
    const byCat = new Map<string, Dataset[]>();
    for (const d of DATASETS) if (d.id !== ds.id && has(d)) (byCat.get(d.category) ?? byCat.set(d.category, []).get(d.category)!).push(d);
    const same = byCat.get(ds.category) ?? [];
    byCat.delete(ds.category);
    return { same, others: [...byCat].sort((x, y) => x[0].localeCompare(y[0])) };
  }, [data, ds]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8" data-compare="">
      <nav className="mb-4 text-sm">
        <a href={data?.back ?? "/map"} className="text-primary underline-offset-2 hover:underline">← Back to the map</a>
      </nav>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Compare places</p>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          <a href={placeHref(a)} className="underline-offset-2 hover:underline">{nameA}</a>
          <span className="font-normal text-muted-foreground"> vs </span>
          <a href={placeHref(b)} className="underline-offset-2 hover:underline">{nameB}</a>
        </h1>
      </header>

      {err ? <StatusState status="error" message="This comparison couldn't be loaded." />
        : !data || !groups ? <StatusState status="loading" message="Loading both places…" />
        : (
          <>
            <Headline ds={ds} a={data.a[ds.id]} b={data.b[ds.id]} names={names} ranks={ranks} />
            {groups.same.length > 0 && (
              <section aria-label={`More in ${ds.category}`} className="mt-8">
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">More in {ds.category}</h2>
                <Rows list={groups.same} data={data} names={names} />
              </section>
            )}
            {groups.others.length > 0 && (
              <details className="group mt-8" data-more-topics="">
                <summary className="cursor-pointer rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">
                  More topics <span className="font-normal text-muted-foreground">({groups.others.length})</span>
                </summary>
                <div className="mt-4 flex flex-col gap-6">
                  {groups.others.map(([cat, list]) => (
                    <section key={cat} aria-label={cat}>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
                      <Rows list={list} data={data} names={names} />
                    </section>
                  ))}
                </div>
              </details>
            )}
            <p className="mt-8 text-xs text-muted-foreground">
              Both places are {LEVEL_WORD[level]}. ± is the ACS 90% margin of error, or the PLACES 95% interval.
              Census survey (ACS) gaps smaller than their margins of error read “About the same”; other sources show the plain difference.
            </p>
          </>
        )}
    </main>
  );
}

function Headline({ ds, a, b, names, ranks }: {
  ds: Dataset; a?: Detail[string]; b?: Detail[string]; names: { a: string; b: string }; ranks: { a: string | null; b: string | null } | null;
}) {
  const ea = a ?? { value: null, moe: null }, eb = b ?? { value: null, moe: null };
  const v = compareValues(ds.measure.kind, ea, eb);
  const survey = isGradable(ds.measure.kind);
  const note = v.kind === "about_same" ? "The gap is within the margins of error (90% confidence), so it may not be real."
    : v.kind === "higher" && v.tested ? "The gap is larger than the margins of error (90% confidence)."
    : v.kind === "higher" && survey ? "One of these has no margin of error, so the gap isn't tested."
    : null;
  return (
    <section aria-label={`${ds.title}: both places`} className="rounded-xl border bg-card p-4 md:p-6" data-compare-headline="">
      <p className="text-sm text-muted-foreground">{ds.title} · {ds.vintage}</p>
      <p className="mt-1 text-3xl font-bold leading-tight tracking-tight text-balance md:text-4xl" data-compare-verdict={v.kind}>
        {verdictText(v, ds.unit, names)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {(["a", "b"] as const).map((k) => {
          const e = k === "a" ? ea : eb, rank = ranks?.[k];
          return (
            <div key={k} className="min-w-0">
              <p className="truncate text-sm font-medium">{names[k]}</p>
              <p className={`text-2xl tabular-nums md:text-3xl ${higherIs(v, k) ? "font-bold" : "font-semibold"}`}>{formatValue(e.value, ds.unit)}</p>
              {e.moe != null && e.moe > 0 && e.value != null && <p className="text-xs tabular-nums text-muted-foreground">±{formatValue(e.moe, ds.unit)}</p>}
              {rank && <p className="mt-1 text-xs text-muted-foreground">{rank}</p>}
            </div>
          );
        })}
      </div>
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}

const higherIs = (v: Verdict, k: "a" | "b") => v.kind === "higher" && v.higher === k;

function Rows({ list, data, names }: { list: Dataset[]; data: { a: Detail; b: Detail }; names: { a: string; b: string } }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      <li aria-hidden className="grid grid-cols-2 gap-3 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span className="truncate">{names.a}</span><span className="truncate">{names.b}</span>
      </li>
      {list.map((d) => {
        const ea = data.a[d.id] ?? { value: null, moe: null }, eb = data.b[d.id] ?? { value: null, moe: null };
        const v = compareValues(d.measure.kind, ea, eb);
        return (
          <li key={d.id} className="px-4 py-3" data-compare-row={d.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-sm font-medium">{d.title}</p>
              <p className="shrink-0 text-xs text-muted-foreground">{rowVerdictText(v, names)}</p>
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-3 text-sm tabular-nums">
              {([ea, eb] as const).map((e, i) => (
                <p key={i} className={higherIs(v, i === 0 ? "a" : "b") ? "font-semibold" : ""}>
                  <span className="sr-only">{i === 0 ? names.a : names.b}: </span>
                  {formatValue(e.value, d.unit)}
                  {e.moe != null && e.moe > 0 && e.value != null && <span className="ml-1 text-xs font-normal text-muted-foreground">±{formatValue(e.moe, d.unit)}</span>}
                </p>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
