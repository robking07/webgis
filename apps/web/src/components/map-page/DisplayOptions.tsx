import { useState } from "react";
import { Info } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
import type { Facet } from "@webgis/registry";
import { TERM_BY_ID } from "@/lib/glossary";

/** Geography level: the dataset's own level by default, any other level at every zoom, or switch with zoom. */
function LevelPicker({ levels, pinned, defaultLevel, note, docked, onChange }: {
  levels: GeoLevel[]; pinned: GeoLevel | null; defaultLevel: GeoLevel | null; note: string; docked?: boolean; onChange: (l: GeoLevel | "auto") => void;
}) {
  return (
    <fieldset>
      <legend className={`mb-1.5 text-xs font-semibold ${docked ? "wg-on-map" : ""}`}>Geography level</legend>
      <div role="radiogroup" aria-label="Geography level" className="flex flex-wrap gap-1.5">
        {([...levels, "auto"] as Array<GeoLevel | "auto">).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={l === "auto" ? !pinned : pinned === l} onClick={() => onChange(l)}
            className={`rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-glass border-transparent text-foreground" : ""}`}>
            {l === "auto" ? "Switch with zoom" : GEO_LEVELS[l].label.replace("Census tract", "Tract")}{l === defaultLevel ? " (default)" : ""}
          </button>
        ))}
      </div>
      <p className={`mt-1.5 text-[11px] leading-snug text-muted-foreground ${docked ? "wg-on-map" : ""}`}>
        {note}
      </p>
    </fieldset>
  );
}
/** One facet as toggle chips with its plain-language explainer behind an info button. */
function FacetFilter({ facet, hidden, onToggle, onAll, docked }: { facet: Facet; hidden?: Set<string>; onToggle: (v: string) => void; onAll: () => void; docked?: boolean }) {
  const [explain, setExplain] = useState(false);
  const term = facet.term ? TERM_BY_ID.get(facet.term) : undefined;
  return (
    <fieldset>
      <div className="mb-1.5 flex items-center gap-1.5">
        <legend className={`text-xs font-semibold ${docked ? "wg-on-map" : ""}`}>{facet.label}</legend>
        <button type="button" onClick={() => setExplain((e) => !e)} aria-expanded={explain} aria-label={`What is ${facet.label.toLowerCase()}?`}
          className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
        {hidden && hidden.size > 0 && <button type="button" onClick={onAll} className={`ml-auto rounded text-[11px] font-semibold text-primary hover:underline ${docked ? "wg-on-map" : ""}`}>Show all</button>}
      </div>
      {explain && (
        <div className={`mb-2 rounded-md p-2 text-[11px] leading-snug ${docked ? "wg-glass" : "bg-muted"}`}>
          <p>{facet.explainer}</p>
          {term && <p className="mt-1 text-muted-foreground">{term.short}</p>}
          <dl className="mt-1.5 space-y-0.5">
            {facet.values.filter((v) => v.description).map((v) => (
              <div key={String(v.value)}><dt className="inline font-semibold">{v.label}: </dt><dd className="inline">{v.description}</dd></div>
            ))}
          </dl>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {facet.values.map((v) => {
          const on = !hidden?.has(String(v.value));
          return (
            <button key={String(v.value)} type="button" aria-pressed={on} onClick={() => onToggle(String(v.value))}
              className={`rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground line-through aria-pressed:border-primary aria-pressed:text-foreground aria-pressed:no-underline focus-visible:outline-2 focus-visible:outline-ring ${docked ? "wg-glass border-transparent" : ""}`}>
              {v.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Display options (geography level, then facet filters): in the dataset card at rest, in the dock when immersed. */
export function DisplayOptions({ levels, pinned, defaultLevel, facets, hidden, docked, onLevel, onToggle, onAll }: {
  levels: GeoLevel[]; pinned: GeoLevel | null; defaultLevel: GeoLevel | null; facets: Facet[] | undefined;
  hidden: Record<string, Set<string>>; docked: boolean;
  onLevel: (l: GeoLevel | "auto") => void; onToggle: (field: string, value: string) => void; onAll: (field: string) => void;
}) {
  const note = pinned
    ? `Showing ${GEO_LEVELS[pinned].label.toLowerCase()}s at every zoom${pinned !== defaultLevel ? "" : pinned === levels[levels.length - 1] ? ", how the source publishes this data" : ", the default for this data"}.`
    : "Switches to smaller areas as you zoom in.";
  return (
    <>
      {levels.length > 1 && (
        <LevelPicker levels={levels} pinned={pinned} defaultLevel={defaultLevel} note={note} docked={docked} onChange={onLevel} />
      )}
      {facets?.map((f) => (
        <FacetFilter key={f.field} facet={f} hidden={hidden[f.field]} docked={docked} onToggle={(v) => onToggle(f.field, v)}
          onAll={() => onAll(f.field)} />
      ))}
    </>
  );
}
