"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Moon, Sun, X } from "lucide-react";
import { BivariateLegend, Legend, Popup, StatusState } from "@webgis/design/components";
import { formatValue, GEO_LEVELS, levelAtZoom, levelBands, type GeoLevel, type ThemeName } from "@webgis/design";
import { DatasetBrowser } from "./DatasetBrowser";
import { DataTable } from "./DataTable";
import { MapView, type FeatureHit, type HoverInfo, type LevelPaint } from "./map/MapView";
import { DATASET_BY_ID, DATASETS, type Dataset } from "@/lib/registry";
import { placeHref, rankText } from "@/lib/place";
import { F_SYSTEM, featureLayerSpec, isFeatureDataset, type FeatureLayerSpec } from "@/lib/layers";
import type { PopupRow } from "@webgis/design/components";
import { BottomSheet, useIsPhone } from "./BottomSheet";
import { PlaceDataList, type Detail } from "./PlaceDataList";
import { parseUrlState, useUrlState, type UrlState } from "@/lib/url-state";
import { classifyBivariate, classifyUnivariate, useDatasetValues, type Values } from "@/lib/values";
import { fetchDetail } from "@/lib/supabase";

const LEVELS = Object.keys(GEO_LEVELS) as GeoLevel[];

export function Viewer({ search }: { search: string }) {
  const [initial] = useState<UrlState>(() => {
    const s = parseUrlState(search);
    return { ...s, d: s.d && DATASET_BY_ID.has(s.d) ? s.d : DATASETS[0]?.id ?? null, b: s.b && DATASET_BY_ID.has(s.b) ? s.b : null };
  });
  const [state, update] = useUrlState(initial);
  const theme = useResolvedTheme(state.theme);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [featureHover, setFeatureHover] = useState<FeatureHit | null>(null);
  const [featureSelected, setFeatureSelected] = useState<FeatureHit | null>(null);
  const [tilesError, setTilesError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  // Phone layout only (below md): the dataset list and full legend start collapsed so
  // the map gets the screen. Desktop always shows both (CSS md: overrides).
  const [browserOpen, setBrowserOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const primary = state.d ? DATASET_BY_ID.get(state.d)! : null;
  // Feature layers (roads, transit…) draw their own geometry: no choropleth, no comparison.
  const isFeature = isFeatureDataset(primary);
  const featureSpec = useMemo(() => (primary && isFeature ? featureLayerSpec(primary) : null), [primary, isFeature]);
  const secondary = state.b && !isFeature && !isFeatureDataset(DATASET_BY_ID.get(state.b)) ? DATASET_BY_ID.get(state.b)! : null;
  // Levels both datasets have, and the zoom band each level is drawn at.
  const availableLevels = useMemo(() => isFeature ? [] : LEVELS.filter((l) => (!primary || primary.geographyLevels.includes(l)) && (!secondary || secondary.geographyLevels.includes(l))), [primary, secondary, isFeature]);
  const bands = useMemo(() => levelBands(availableLevels), [availableLevels]);
  // Start loading tract values a little before tracts appear.
  const wantTract = !!bands.tract && state.at.zoom >= bands.tract.minzoom - 1;
  const x = useDatasetValues(primary, wantTract);
  const y = useDatasetValues(secondary, wantTract);
  const level = levelAtZoom(bands, state.at.zoom) ?? availableLevels[0] ?? "county";

  const classed = useMemo(() => {
    const out: Partial<Record<GeoLevel, LevelPaint & { breaks?: number[]; xBreaks?: number[]; yBreaks?: number[]; minClass?: number }>> = {};
    if (!primary) return out;
    for (const l of LEVELS) {
      const xv = x.values[l];
      if (!xv) continue;
      if (secondary) {
        const yv = y.values[l];
        if (yv) out[l] = classifyBivariate(xv, yv);
      } else {
        out[l] = classifyUnivariate(primary, xv);
      }
    }
    return out;
  }, [primary, secondary, x.values, y.values]);

  const current = classed[level];
  const error = x.error ?? y.error;
  const available = !!primary && !isFeature && availableLevels.includes(level);
  // Clear selections when the dataset changes.
  useEffect(() => { setSelected(null); setFeatureSelected(null); setFeatureHover(null); }, [state.d]);
  const loading = available && !current && !error;

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row">
      <a href="#datasets" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow">Skip to datasets</a>
      <aside className={`z-10 flex w-full flex-col gap-3 border-b bg-background p-3 md:max-h-none md:w-80 md:border-b-0 md:border-r md:p-4 ${browserOpen ? "max-h-[70dvh]" : ""}`}>
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-3 md:block">
            <h1 className="text-base font-semibold tracking-tight">webgis</h1>
            <p className="hidden text-xs text-muted-foreground md:block">Transportation &amp; planning data, mapped.</p>
            {/* Phone: section links sit on the title row to save height. */}
            <a href="/insights" className="truncate text-sm text-muted-foreground hover:text-foreground md:hidden">Weird Insights</a>
          </div>
          <ThemeToggle theme={theme} onChange={(t) => update({ theme: t })} />
        </header>
        <nav aria-label="Sections" className="hidden gap-3 text-sm md:flex">
          <span aria-current="page" className="font-medium">Map</span>
          <a href="/insights" className="text-muted-foreground hover:text-foreground">Weird Insights</a>
        </nav>
        {/* Phone: one-line summary of what's mapped; tap to open the dataset list. */}
        <button type="button" onClick={() => setBrowserOpen((o) => !o)} aria-expanded={browserOpen} aria-controls="datasets-panel"
          className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm md:hidden focus-visible:outline-2 focus-visible:outline-ring">
          <span className="min-w-0 truncate">
            <span className="font-medium">{primary?.title ?? "Choose a dataset"}</span>
            {secondary && <span className="text-muted-foreground"> × {secondary.title}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
            {browserOpen ? "Close" : "Datasets"}{browserOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </button>
        <div id="datasets-panel" className={`min-h-0 flex-1 flex-col gap-3 ${browserOpen ? "flex" : "hidden"} md:flex`}>
          <DatasetBrowser primary={state.d} secondary={state.b}
            onPrimary={(id) => { update({ d: id, b: state.b === id ? null : state.b }); setBrowserOpen(false); }}
            onSecondary={(id) => { update({ b: id }); setBrowserOpen(false); }} />
        </div>
      </aside>

      <main className="relative min-h-0 flex-1">
        <MapView
          theme={theme}
          initialView={initial.at}
          paint={classed}
          onViewChange={(at) => update({ at })}
          onHover={setHover}
          onSelect={setSelected}
          onTilesError={setTilesError}
          levelZooms={bands}
          featureLayer={featureSpec}
          onFeatureHover={setFeatureHover}
          onFeatureSelect={setFeatureSelected}
          ariaLabel={primary ? `Map of ${primary.title}${secondary ? ` compared with ${secondary.title}` : ""} by ${GEO_LEVELS[level].label.toLowerCase()}` : "Map"}
        />

        {/* Legend. Phone: a compact color strip; tap to expand. */}
        {featureSpec && primary && !legendOpen && (
          <button type="button" onClick={() => setLegendOpen(true)} aria-expanded={false} aria-label={`Show legend for ${primary.title}`}
            className="absolute bottom-8 left-3 z-10 flex items-center gap-2 rounded-lg border bg-card/95 px-2.5 py-1.5 shadow-sm backdrop-blur md:hidden focus-visible:outline-2 focus-visible:outline-ring">
            <span className="flex overflow-hidden rounded-sm" aria-hidden>
              {featureSpec.colors.map((c, i) => <span key={i} className="h-1.5 w-4 self-center" style={{ background: c }} />)}
            </span>
            <span className="text-xs font-medium">Legend</span>
            <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        )}
        {primary && available && current && !legendOpen && (
          <button type="button" onClick={() => setLegendOpen(true)} aria-expanded={false} aria-label={`Show legend for ${primary.title}`}
            className="absolute bottom-8 left-3 z-10 flex items-center gap-2 rounded-lg border bg-card/95 px-2.5 py-1.5 shadow-sm backdrop-blur md:hidden focus-visible:outline-2 focus-visible:outline-ring">
            <span className="flex overflow-hidden rounded-sm" aria-hidden>
              {(secondary ? [current.colors[0], current.colors[4], current.colors[8]] : current.colors).map((c, i) => (
                <span key={i} className="h-3 w-4" style={{ background: c }} />
              ))}
            </span>
            <span className="text-xs font-medium">Legend</span>
            <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        )}
        <div className={`absolute bottom-8 left-3 right-3 z-10 max-h-[55%] overflow-y-auto rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur md:left-auto md:right-3 md:max-h-none md:max-w-64 md:block ${legendOpen || !(primary && ((available && current) || featureSpec)) ? "block" : "hidden"}`}>
          {legendOpen && (
            <button type="button" onClick={() => setLegendOpen(false)} aria-label="Collapse legend"
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground md:hidden focus-visible:outline-2 focus-visible:outline-ring">
              <ChevronDown className="size-4" />
            </button>
          )}
          {primary && isFeature ? (featureSpec ? (
              <Legend title={primary.title} unit={primary.unit} colors={featureSpec.colors} breaks={featureSpec.breaks} showNoData={false} swatch="line"
                caption={`${primary.vintage} · ${featureSpec.featureCount.toLocaleString()} segments · wider lines = higher road class${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
            ) : <StatusState status="empty" message="This layer hasn't been built yet." />)
            : error ? <StatusState status="error" message={error} />
            : primary && !available ? <StatusState status="empty" message="These two datasets don't share a geography level, so they can't be compared." />
            : loading ? <StatusState status="loading" message="Loading data…" />
            : primary && secondary && current?.xBreaks ? (
              <BivariateLegend xTitle={primary.title} yTitle={secondary.title} colors={current.colors} />
            ) : primary && current?.breaks ? (
              <Legend title={primary.title} unit={primary.unit} colors={current.colors} breaks={current.breaks} minClass={current.minClass}
                caption={`${GEO_LEVELS[level].label} · ${primary.vintage} · ${primary.source.name.split(",")[0]}${primary.coverageNote ? `. ${primary.coverageNote}` : ""}`} />
            ) : null}
          {primary && available && current && (
            <button type="button" onClick={() => setTableOpen(true)}
              className="mt-2 text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded">
              View as table
            </button>
          )}
        </div>

        {tableOpen && primary && (
          <DataTable level={level} x={primary} xv={x.values[level]} y={secondary} yv={y.values[level]} onClose={() => setTableOpen(false)} />
        )}

        {tilesError && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg border bg-card p-1 shadow-sm">
            <StatusState status="error" message="Boundary tiles aren't available yet." />
          </div>
        )}

        {/* Hover tooltip */}
        {hover && !selected && primary && (
          <div className="pointer-events-none absolute z-20 rounded-md border bg-popover p-2.5 shadow-md"
            style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <Popup title={hover.name} subtitle={GEO_LEVELS[hover.level].label}
              rows={[primary, secondary].filter((d) => !!d).map((d) => ({
                label: d!.title, unit: d!.unit,
                value: (d === primary ? x : y).values[hover.level]?.[hover.geoid],
              }))} />
          </div>
        )}

        {featureHover && !featureSelected && featureSpec && (
          <div className="pointer-events-none absolute z-20 rounded-md border bg-popover p-2.5 shadow-md" style={{ left: featureHover.x + 14, top: featureHover.y + 14 }}>
            <Popup title={featureTitle(featureHover)} rows={featureRows(featureSpec, featureHover).slice(0, 2)} />
          </div>
        )}
        {featureSelected && featureSpec && (
          <FeaturePanel hit={featureSelected} spec={featureSpec} onClose={() => setFeatureSelected(null)} />
        )}

        {selected && primary && (
          <DetailPanel info={selected} onClose={() => setSelected(null)} primary={primary} secondary={secondary}
            xv={x.values[selected.level]} yv={y.values[selected.level]}
            onMapIt={(id) => update({ d: id, b: state.b === id ? null : state.b })} />
        )}
      </main>
    </div>
  );
}

interface DetailProps {
  info: HoverInfo;
  onClose: () => void;
  primary: Dataset;
  secondary: Dataset | null;
  /** Loaded values at the clicked feature's level, for the rank line. */
  xv?: Values;
  yv?: Values;
  /** Switch the map to another dataset (from the drawer's full list). */
  onMapIt: (id: string) => void;
}

function DetailPanel({ info, onClose, primary, secondary, xv, yv, onMapIt }: DetailProps) {
  const [rows, setRows] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phone = useIsPhone();
  useEffect(() => {
    let live = true;
    setRows(null); setErr(null);
    fetchDetail(info.geoid).then((r) => live && setRows(r), (e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [info.geoid]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const featured = [primary, secondary].filter((d): d is Dataset => !!d);
  const summary = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold leading-snug">{info.name}</h2>
          <p className="text-xs text-muted-foreground">{GEO_LEVELS[info.level].label}</p>
        </div>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      {err ? <StatusState status="error" message="Details are unavailable right now." />
        : !rows ? <StatusState status="loading" />
        : (
          <div className="space-y-2">
            {featured.map((d, i) => {
              const r = rows[d.id];
              const rank = rankText(i === 0 ? xv : yv, r?.value, info.level);
              return (
                <div key={d.id} className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">{d.title}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatValue(r?.value, d.unit)}
                    {r?.moe != null && r.moe > 0 && r.value != null && <span className="ml-1 text-xs font-normal text-muted-foreground">±{formatValue(r.moe, d.unit)}</span>}
                  </p>
                  {rank && <p className="text-xs text-muted-foreground">{rank}</p>}
                </div>
              );
            })}
          </div>
        )}
      {phone && rows && <p className="mt-2 text-center text-xs text-muted-foreground group-data-[snap=full]:hidden">Swipe up for all {Object.keys(rows).length} datasets here</p>}
    </>
  );

  if (phone) {
    return (
      <BottomSheet label={`Details for ${info.name}`} summary={summary} onClose={onClose}>
        {rows && (
          <>
            <PlaceDataList level={info.level} detail={rows} onMapIt={onMapIt} compact />
            <a href={placeHref(info.geoid)} className="mt-4 block text-sm font-medium text-primary underline-offset-2 hover:underline">Open the full place profile →</a>
          </>
        )}
      </BottomSheet>
    );
  }
  return (
    <section aria-label={`Details for ${info.name}`}
      className="absolute left-3 top-3 z-20 max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md">
      {summary}
      {rows && (
        <a href={placeHref(info.geoid)}
          className="mt-3 flex items-center justify-between rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Full place profile: all datasets for {info.name.split(",")[0]} <span aria-hidden>→</span>
        </a>
      )}
    </section>
  );
}

/** Readable title: the road class ("Minor arterial"); the raw route ID is a detail row. */
function featureTitle(h: FeatureHit): string {
  const fs = Number(h.properties.f_system);
  return F_SYSTEM[fs] ? `${F_SYSTEM[fs]} segment` : "Road segment";
}

/** Popup rows for a feature: the registry's field labels, formatted by field. */
function featureRows(spec: FeatureLayerSpec, h: FeatureHit): PopupRow[] {
  const rows: PopupRow[] = [];
  for (const [field, label] of Object.entries(spec.fields)) {
    const v = h.properties[field];
    if (v == null || v === "") continue;
    if (field === "route_id") { rows.push({ label, value: null, unit: "count", text: String(v) }); continue; }
    if (field === spec.rankField && field === "f_system") rows.push({ label, value: null, unit: "count", text: F_SYSTEM[Number(v)] ?? String(v) });
    else if (field.startsWith("aadt")) rows.push({ label, value: Number(v), unit: "vehicles_per_day" });
    else rows.push({ label, value: Number(v), unit: "count" });
  }
  // Lead with the mapped value.
  return rows.sort((a, b) => (b.label === spec.fields[spec.valueField] ? 1 : 0) - (a.label === spec.fields[spec.valueField] ? 1 : 0));
}

function FeaturePanel({ hit, spec, onClose }: { hit: FeatureHit; spec: FeatureLayerSpec; onClose: () => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const body = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug">{featureTitle(hit)}</h2>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      <Popup rows={featureRows(spec, hit)} />
    </>
  );
  if (phone) return <BottomSheet label={`Details for ${featureTitle(hit)}`} summary={body} onClose={onClose}>{null}</BottomSheet>;
  return <section aria-label={`Details for ${featureTitle(hit)}`} className="absolute left-3 top-3 z-20 w-72 rounded-lg border bg-popover p-3 shadow-md">{body}</section>;
}

function useResolvedTheme(explicit: ThemeName | null): ThemeName {
  const [system, setSystem] = useState<ThemeName>("light");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const set = () => setSystem(mq.matches ? "dark" : "light");
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  const theme = explicit ?? system;
  useEffect(() => {
    if (explicit) document.documentElement.dataset.theme = explicit;
    else delete document.documentElement.dataset.theme;
  }, [explicit]);
  return theme;
}

function ThemeToggle({ theme, onChange }: { theme: ThemeName; onChange: (t: ThemeName) => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => onChange(next)} aria-label={`Switch to ${next} theme`}
      className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
