"use client";
// One search for places and datasets (D-35). Opens over a dimmed map with large results,
// places and datasets in separate labeled groups. Arrow keys move, Enter picks, Esc closes.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Layers, LocateFixed, Search, X } from "lucide-react";
import { searchDatasets, type Dataset } from "@/lib/registry";
import { countyForZip, loadPlaceIndex, parseQuery, placeByGeoid, searchPlaces, type PlaceHit, type PlaceRow } from "@/lib/search";
import { findAddress, looksLikeAddress, type AddressMatch } from "@/lib/geocode";

interface Props {
  onClose: () => void;
  onPlace: (p: PlaceHit) => void;
  onDataset: (d: Dataset) => void;
  /** "asthma in Duluth" (issue #363): open that map, framed on that place. */
  onBoth: (d: Dataset, p: PlaceHit) => void;
  /** A street address the Census geocoder matched (issue #363). */
  onAddress: (m: AddressMatch) => void;
  current: string | null;
  /** Phones (issue #246): full screen, the field centered until typing starts, then up top; results from the 2nd character. */
  full?: boolean;
}

type Item = { kind: "place"; p: PlaceHit } | { kind: "dataset"; d: Dataset } | { kind: "both"; d: Dataset; p: PlaceHit } | { kind: "address" };

export function SearchOverlay({ onClose, onPlace, onDataset, onBoth, onAddress, current, full }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PlaceRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    input.current?.focus();
    loadPlaceIndex().then(setRows, () => setFailed(true));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const typing = q.length > 0;
  const showResults = !full || q.trim().length >= 2;
  const [zipGeoid, setZipGeoid] = useState<{ zip: string; geoid: string | null } | null>(null);
  const zip = /^\d{5}$/.test(q.trim()) ? q.trim() : null;
  useEffect(() => { if (zip) countyForZip(zip).then((geoid) => setZipGeoid({ zip, geoid }), () => {}); }, [zip]);
  const places = useMemo(() => {
    if (!rows) return [];
    const z = zip && zipGeoid?.zip === zip && zipGeoid.geoid ? placeByGeoid(rows, zipGeoid.geoid) : null;
    return z ? [z] : searchPlaces(rows, q);
  }, [rows, q, zip, zipGeoid]);
  const datasets = useMemo(() => (q.trim() ? searchDatasets(q, null).slice(0, 6) : []), [q]);
  const address = looksLikeAddress(q);
  // The address lookup's state for the text it ran on: "busy", "none" (no match) or "failed".
  const [lookup, setLookup] = useState<{ q: string; state: "busy" | "none" | "failed" } | null>(null);
  const lookupState = lookup?.q === q ? lookup.state : null;
  const both = useMemo(() => {
    const t = parseQuery(q);
    const d = t && searchDatasets(t.topic, null)[0], p = t && rows && searchPlaces(rows, t.place, 1)[0];
    return d && p ? { kind: "both" as const, d, p } : null;
  }, [q, rows]);
  const lead: Item[] = address ? [{ kind: "address" }] : both ? [both] : [];
  const items: Item[] = !showResults ? [] : [...lead, ...places.map((p) => ({ kind: "place" as const, p })), ...datasets.map((d) => ({ kind: "dataset" as const, d }))];

  const lookUp = () => {
    const asked = q;
    setLookup({ q: asked, state: "busy" });
    findAddress(asked).then((m) => (m ? onAddress(m) : setLookup({ q: asked, state: "none" })), () => setLookup({ q: asked, state: "failed" }));
  };
  const pick = (it: Item) => {
    if (it.kind === "place") onPlace(it.p);
    else if (it.kind === "dataset") onDataset(it.d);
    else if (it.kind === "both") onBoth(it.d, it.p);
    else if (lookupState !== "busy") lookUp();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && items[active]) { e.preventDefault(); pick(items[active]); }
  };
  const optId = (i: number) => `${listId}-${i}`;

  const row = (it: Item, i: number) => {
    const on = i === active;
    const cls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${on ? "bg-muted" : "hover:bg-muted/60"}`;
    if (it.kind === "address" || it.kind === "both") return (
      <li key={it.kind} id={optId(i)} role="option" aria-selected={on}>
        <button type="button" className={cls} onClick={() => pick(it)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
          {it.kind === "address" ? <LocateFixed className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-base font-medium">
            {it.kind === "both" ? `${it.d.title} in ${it.p.name}` : lookupState === "busy" ? "Looking up the address…" : lookupState === "none" ? "No match for that address" : lookupState === "failed" ? "The address lookup isn't working right now" : "Find this address"}
          </span>
          {it.kind === "both" && <span className="shrink-0 text-xs text-muted-foreground">Map</span>}
        </button>
      </li>
    );
    return it.kind === "place" ? (
      <li key={`p${i}`} id={optId(i)} role="option" aria-selected={on}>
        <button type="button" className={cls} onClick={() => pick(it)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-base font-medium">{it.p.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{it.p.kind}</span>
        </button>
      </li>
    ) : (
      <li key={`d${i}`} id={optId(i)} role="option" aria-selected={on}>
        <button type="button" className={cls} onClick={() => pick(it)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
          <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium">{it.d.title}{it.d.id === current && <span className="ml-2 text-xs font-normal text-muted-foreground">On the map</span>}</span>
            <span className="block truncate text-xs text-muted-foreground">{it.d.category} · {it.d.vintage}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-center ${full ? "bg-background" : "bg-black/55 px-3 pt-[8vh] md:pt-[12vh]"}`} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search places and datasets"
        // Phones: the field rests mid-screen and slides up once typing starts (the global reduced-motion rule stops the slide).
        className={full ? `flex w-full flex-col transition-[padding] duration-300 ease-out ${typing ? "pt-2" : "pt-[calc(50dvh-2rem)]"}` : "flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"}>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
            placeholder={full ? "Search places or data..." : "Search a place or a dataset"} aria-label="Search places and datasets"
            role="combobox" aria-expanded={items.length > 0} aria-controls={listId} aria-activedescendant={items[active] ? optId(active) : undefined}
            className={`h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground md:text-xl ${full && !typing ? "text-center" : ""}`} />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
        </div>
        {address && <p className="border-b px-4 py-2 text-xs text-muted-foreground">Addresses are looked up by the Census Bureau&apos;s public geocoder to find the census tract. Mapwich doesn&apos;t keep them.</p>}
        <div id={listId} role="listbox" aria-label="Results" className="min-h-0 overflow-y-auto p-2">
          {!q.trim() && !full && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Try a city, county or state (“Duluth”, “Cook County”) or a topic (“commute”, “asthma”).</p>}
          {q.trim() && showResults && (
            <>
              {lead.length > 0 && <ul className="py-1">{lead.map((it) => row(it, 0))}</ul>}
              <Group label="Places" empty={q.trim().length < 2 ? "Keep typing…" : failed ? "Place search is unavailable right now." : !rows ? "Loading places…" : "No matching places."}>
                {places.map((p, i) => row({ kind: "place", p }, lead.length + i))}
              </Group>
              <Group label="Datasets" empty="No matching datasets.">
                {datasets.map((d, i) => row({ kind: "dataset", d }, lead.length + places.length + i))}
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, empty, children }: { label: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section aria-label={label} className="py-1">
      <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
      {children.length ? <ul>{children}</ul> : <p className="px-3 py-2 text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
