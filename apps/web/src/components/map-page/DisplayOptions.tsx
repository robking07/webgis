import { useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { GEO_LEVELS, type GeoLevel } from "@webgis/design";
import type { Facet } from "@webgis/registry";
import { TERM_BY_ID } from "@/lib/glossary";

const short = (l: GeoLevel) => GEO_LEVELS[l].label.replace("Census tract", "Tract");

/** Geography level as a path, coarse to fine (issue #34): "Switch with zoom" walks the path as
 *  the map zooms, with the level shown now marked; tapping a level pins it at every zoom (D-133).
 *  A pinned block group or block waits until the map is zoomed in past multi-state views
 *  (`pinFloor`); its step says "zoom in" until then. */
function LevelPicker({ levels, pinned, shown, note, onChange }: {
  levels: GeoLevel[]; pinned: GeoLevel | null; shown: GeoLevel; note: string; onChange: (l: GeoLevel | "auto") => void;
}) {
  const auto = !pinned;
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold">Geography level</legend>
      <div role="radiogroup" aria-label="Geography level" className="space-y-1.5">
        <button type="button" role="radio" aria-checked={auto} onClick={() => onChange("auto")}
          className={`rounded-full border px-2.5 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-ring ${auto ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Switch with zoom
        </button>
        <ol className="flex flex-wrap items-center gap-y-1 text-xs">
          {levels.map((l, i) => {
            const on = pinned === l;
            const here = l === shown;
            // Pinned: solid. Switching with zoom: the level shown now is outlined in the accent.
            const look = on ? "border-primary bg-primary text-primary-foreground" : here ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground";
            return (
              <li key={l} className="flex items-center">
                {i > 0 && <ChevronRight className="mx-0.5 size-3 text-muted-foreground" aria-hidden />}
                <button type="button" role="radio" aria-checked={on} onClick={() => onChange(l)} aria-current={here ? "true" : undefined}
                  className={`rounded-full border px-2 py-0.5 focus-visible:outline-2 focus-visible:outline-ring ${look}`}>
                  {short(l)}{on && !here ? " (zoom in)" : ""}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{note}</p>
    </fieldset>
  );
}

/** "Road type" → "road types", "Functional class" → "functional classes". */
export const pluralLabel = (label: string) => {
  const l = label.toLowerCase();
  return /(s|x|ch|sh)$/.test(l) ? `${l}es` : `${l}s`;
};

/** One facet as toggle chips with its plain-language explainer behind an info button. In the
 *  dock, a group nobody has touched stays folded to one line ("Functional class ▸ all shown"):
 *  options appear as you dig in. */
function FacetFilter({ facet, hidden, onToggle, onAll, docked }: { facet: Facet; hidden?: Set<string>; onToggle: (v: string) => void; onAll: () => void; docked?: boolean }) {
  const [explain, setExplain] = useState(false);
  const touched = !!hidden && hidden.size > 0;
  const [expanded, setExpanded] = useState(!docked || touched);
  const term = facet.term ? TERM_BY_ID.get(facet.term) : undefined;
  if (!expanded && !touched) {
    return (
      <button type="button" onClick={() => setExpanded(true)} aria-expanded={false}
        className="flex w-full items-center gap-1 rounded text-left text-xs focus-visible:outline-2 focus-visible:outline-ring">
        <span className="font-semibold">{facet.label}</span>
        <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">all shown</span>
      </button>
    );
  }
  return (
    <fieldset>
      <div className="mb-1.5 flex items-center gap-1.5">
        <legend className="text-xs font-semibold">{facet.label}</legend>
        <button type="button" onClick={() => setExplain((e) => !e)} aria-expanded={explain} aria-label={`What is ${facet.label.toLowerCase()}?`}
          className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" aria-hidden /></button>
        {touched && <button type="button" onClick={onAll} className="ml-auto rounded text-[11px] font-semibold text-primary hover:underline">Show all</button>}
      </div>
      {explain && (
        <div className="mb-2 rounded-md bg-muted p-2 text-[11px] leading-snug">
          <p>{facet.explainer}</p>
          {term && <p className="mt-1 text-muted-foreground">{term.short}</p>}
          <dl className="mt-1.5 space-y-0.5">
            {facet.values.filter((v) => v.description).map((v) => (
              <div key={String(v.value)}><dt className="inline font-semibold">{v.label}: </dt><dd className="inline">{v.description}</dd></div>
            ))}
          </dl>
        </div>
      )}
      {/* Shown values are solid chips, hidden ones outlined and struck through. */}
      <div className="flex flex-wrap gap-1.5">
        {facet.values.map((v) => {
          const on = !hidden?.has(String(v.value));
          return (
            <button key={String(v.value)} type="button" aria-pressed={on} onClick={() => onToggle(String(v.value))}
              className={`rounded-full border px-2.5 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-ring ${on ? "border-primary bg-primary text-primary-foreground" : "border-dashed text-muted-foreground line-through"}`}>
              {v.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Display options (geography level, then facet filters): in the dataset card at rest, in the dock when immersed. */
export function DisplayOptions({ levels, pinned, shown, facets, hidden, docked, onLevel, onToggle, onAll }: {
  levels: GeoLevel[]; pinned: GeoLevel | null; shown: GeoLevel; facets: Facet[] | undefined;
  hidden: Record<string, Set<string>>; docked: boolean;
  onLevel: (l: GeoLevel | "auto") => void; onToggle: (field: string, value: string) => void; onAll: (field: string) => void;
}) {
  const plural = (l: GeoLevel) => GEO_LEVELS[l].plural.toLowerCase();
  const note = !pinned
    ? `Showing ${plural(shown)} now. Tap a level to keep it at every zoom.`
    : pinned === shown
      ? `Showing ${plural(pinned)} at every zoom${"pinFloor" in GEO_LEVELS[pinned] ? " closer than a few states" : ""}.`
      : `${GEO_LEVELS[pinned].plural} show once you zoom in closer than a few states. Showing ${plural(shown)} until then.`;
  return (
    <>
      {levels.length > 1 && (
        <LevelPicker levels={levels} pinned={pinned} shown={shown} note={note} onChange={onLevel} />
      )}
      {facets?.map((f) => (
        <FacetFilter key={f.field} facet={f} hidden={hidden[f.field]} docked={docked} onToggle={(v) => onToggle(f.field, v)}
          onAll={() => onAll(f.field)} />
      ))}
    </>
  );
}
