import { useEffect } from "react";
import { X } from "lucide-react";
import { Popup, type PopupRow } from "@webgis/design/components";
import type { Facet } from "@webgis/registry";
import type { FeatureHit } from "../map/MapView";
import type { Dataset } from "@/lib/registry";
import { F_SYSTEM, type FeatureField, type FeatureLayerSpec } from "@/lib/layers";
import { learnMoreLinks } from "@/lib/learn-more";
import { BottomSheet, useIsPhone } from "../BottomSheet";
import { LearnMore } from "./LearnMore";

/** Readable title: the signed route ("I-35", "US 52"), else the street name, else the road class. */
export function featureTitle(h: FeatureHit, spec?: FeatureLayerSpec): string {
  const p = h.properties;
  if (p.tract && p.place) return `Census tract ${Number(String(p.tract).slice(5)) / 100}, ${p.place}`;
  if (p.route) return String(p.route);
  if (p.street) return titleCase(String(p.street));
  const fs = Number(p.f_system);
  return F_SYSTEM[fs] ? `${F_SYSTEM[fs]} segment` : spec ? "Segment" : "Road segment";
}

/** Some states publish street names in capitals; show them in title case. */
function titleCase(s: string) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()) : s;
}

const fieldSpec = (f: FeatureField | string): FeatureField => (typeof f === "string" ? { label: f } : f);

/** Popup rows: registry field labels and units; categorical codes shown with their facet labels.
 *  `skipLists` leaves out list fields with per-item explainers (the panel shows them in full). */
export function featureRows(spec: FeatureLayerSpec, h: FeatureHit, facets: Facet[] = [], skipLists = false): PopupRow[] {
  const rows: PopupRow[] = [];
  for (const [field, f] of Object.entries(spec.fields)) {
    const { label, unit, items } = fieldSpec(f);
    const v = h.properties[field];
    if (v == null || v === "") continue;
    if (field === "route" || field === "place") continue; // part of the title
    if (field === "street" && !h.properties.route) continue; // already the title
    if (skipLists && items) continue;
    const facet = facets.find((x) => x.field === field);
    const facetLabel = facet?.values.find((x) => String(x.value) === String(v))?.label;
    if (facetLabel) rows.push({ label, value: null, unit: "count", text: facetLabel });
    else if (typeof v === "string" && isNaN(Number(v))) rows.push({ label, value: null, unit: "count", text: titleCase(v) });
    else rows.push({ label, value: Number(v), unit: (unit ?? "count") as PopupRow["unit"] });
  }
  // Lead with the mapped value.
  const main = fieldSpec(spec.fields[spec.valueField] ?? "").label;
  return rows.sort((a, b) => (b.label === main ? 1 : 0) - (a.label === main ? 1 : 0));
}

/** List fields (e.g. CEJST burdens) item by item, each with its explainer and source link. */
function ExplainedLists({ spec, hit }: { spec: FeatureLayerSpec; hit: FeatureHit }) {
  const lists = Object.entries(spec.fields).map(([k, f]) => [k, fieldSpec(f)] as const)
    .filter(([k, f]) => f.items && hit.properties[k]);
  const notes = Object.entries(spec.fields).map(([k, f]) => [k, fieldSpec(f)] as const)
    .filter(([k, f]) => !f.items && f.explainer && hit.properties[k] != null);
  if (!lists.length && !notes.length) return null;
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {lists.map(([k, f]) => (
        <section key={k} aria-label={f.label}>
          <h3 className="text-xs font-semibold">{f.label}</h3>
          {f.explainer && <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{f.explainer}</p>}
          <ul className="mt-1.5 space-y-1.5">
            {String(hit.properties[k]).split(", ").map((item) => {
              const it = f.items?.[item];
              return (
                <li key={item} className="text-[12px] leading-snug">
                  {it?.url ? <a href={it.url} target="_blank" rel="noopener" className="font-semibold text-primary underline-offset-2 hover:underline">{item}</a> : <span className="font-semibold">{item}</span>}
                  {it?.description && <span className="text-muted-foreground"> — {it.description}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {notes.length > 0 && (
        <dl className="space-y-1.5 text-[11.5px] leading-snug">
          {notes.map(([k, f]) => (
            <div key={k}>
              <dt className="inline font-semibold">{f.label}: </dt>
              <dd className="inline text-muted-foreground">{f.explainer}{f.url && <> <a href={f.url} target="_blank" rel="noopener" className="text-primary hover:underline">More</a></>}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** A clicked feature (e.g. a road segment): its fields, explainers and links. */
export function FeaturePanel({ hit, spec, dataset, top, onClose }: { hit: FeatureHit; spec: FeatureLayerSpec; dataset: Dataset; top: number; onClose: () => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const links = learnMoreLinks(dataset, { lon: hit.lon, lat: hit.lat, props: hit.properties });
  const head = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug">{featureTitle(hit)}</h2>
        <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close details" className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" />
        </button>
      </div>
      <Popup rows={featureRows(spec, hit, dataset.facets, true)} />
    </>
  );
  const more = (
    <>
      <ExplainedLists spec={spec} hit={hit} />
      <LearnMore links={links} />
    </>
  );
  if (phone) return <BottomSheet label={`Details for ${featureTitle(hit)}`} summary={head} onClose={onClose}>{more}</BottomSheet>;
  return (
    <section aria-label={`Details for ${featureTitle(hit)}`} data-obstructs=""
      className="absolute right-[72px] z-30 w-80 overflow-y-auto rounded-lg border bg-popover p-3 shadow-md transition-[top] duration-300"
      style={{ top, maxHeight: `calc(100% - ${top + 12}px)` }}>
      {head}{more}
    </section>
  );
}
