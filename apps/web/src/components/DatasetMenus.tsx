"use client";
// The immersed map heading (D-33): the category sits above the dataset name. Clicking the
// category lays the category list over the heading; keeping the same category (or picking
// another) opens the list of that category's datasets under the name. The name's caret
// opens that list directly.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CATEGORIES, DATASETS, type Dataset } from "@/lib/registry";

interface Props {
  primary: Dataset;
  secondary: Dataset | null;
  onPick: (id: string) => void;
}

type Menu = null | { kind: "category" } | { kind: "datasets"; category: string };

export function DatasetHeading({ primary, secondary, onPick }: Props) {
  const [menu, setMenu] = useState<Menu>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setMenu(null); } };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc, true); };
  }, [menu]);

  const listCategory = menu?.kind === "datasets" ? menu.category : primary.category;
  const inCategory = DATASETS.filter((d) => d.category === listCategory);
  const counts = new Map(CATEGORIES.map((c) => [c, DATASETS.filter((d) => d.category === c).length]));

  return (
    <div ref={ref} className="relative pointer-events-auto ml-0.5 w-fit max-w-[calc(100vw-1.5rem)]">
      <button type="button" onClick={() => setMenu(menu?.kind === "category" ? null : { kind: "category" })}
        aria-expanded={menu?.kind === "category"} aria-haspopup="menu"
        className="wg-on-map flex items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wider text-foreground/75 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {primary.category} <ChevronDown className="size-3" aria-hidden />
      </button>
      <button type="button" onClick={() => setMenu(menu?.kind === "datasets" ? null : { kind: "datasets", category: primary.category })}
        aria-expanded={menu?.kind === "datasets"} aria-haspopup="menu" aria-label={`${primary.title}: other ${primary.category.toLowerCase()} datasets`}
        className="flex items-center gap-1.5 rounded text-left focus-visible:outline-2 focus-visible:outline-ring">
        <span className="wg-on-map text-base font-bold leading-snug text-foreground md:text-[17px]">
          {primary.title}{secondary && <span className="font-semibold text-foreground/75"> × {secondary.title}</span>}
        </span>
        <ChevronDown className={`wg-on-map size-4 shrink-0 text-foreground transition-transform ${menu?.kind === "datasets" ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {menu?.kind === "category" && (
        <div role="menu" aria-label="Categories" className="absolute -left-1 -top-1 z-30 w-64 max-h-[70vh] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="menuitem" onClick={() => setMenu({ kind: "datasets", category: c })}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <span className="flex-1">{c}</span>
              {c === primary.category ? <Check className="size-3.5 text-primary" aria-label="current" /> : <span className="text-xs text-muted-foreground">{counts.get(c)}</span>}
            </button>
          ))}
        </div>
      )}
      {menu?.kind === "datasets" && (
        <div role="menu" aria-label={`${listCategory} datasets`} className="absolute left-0 top-full z-30 mt-1.5 w-80 max-w-[calc(100vw-1.5rem)] max-h-[60vh] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl">
          <button type="button" onClick={() => setMenu({ kind: "category" })}
            className="flex w-full items-center gap-1 rounded px-2.5 pb-1 pt-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
            {listCategory} <ChevronDown className="size-3" aria-hidden />
          </button>
          {inCategory.map((d) => (
            <button key={d.id} type="button" role="menuitemradio" aria-checked={d.id === primary.id}
              onClick={() => { onPick(d.id); setMenu(null); }}
              className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug">{d.title}</span>
                <span className="block text-xs text-muted-foreground">{d.vintage}</span>
              </span>
              {d.id === primary.id && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
