"use client";
// One header for every page (D-33, P1): logo and wordmark, Map · Specials, then (right-justified)
// a search icon and Settings (D-35). On the map, search opens the place + dataset search over the
// map and Settings adds map units; elsewhere search goes to the data directory.
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { ThemeName } from "@webgis/design";
import { forgetTheme, readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { LogoMark } from "./Logo";
import { SettingsMenu, type ScaleUnit } from "./SettingsMenu";

type Section = "map" | "specials";

export function HeaderContent({ current, onSearch, explicitTheme, onTheme, unit, onUnit }: {
  current?: Section;
  /** Opens the place + dataset search (map). Without it, search links to the data directory. */
  onSearch?: () => void;
  /** The explicit theme choice, or null when following the system. */
  explicitTheme: ThemeName | null;
  onTheme: (t: ThemeName | null) => void;
  /** Map pages: distance units for the scale bar. */
  unit?: ScaleUnit;
  onUnit?: (u: ScaleUnit) => void;
}) {
  const nav = (href: string, label: string, key: Section) => current === key
    ? <Link href={href} aria-current="page" className="font-semibold text-foreground shadow-[inset_0_-2px_0_var(--ui-accent)]">{label}</Link>
    : <Link href={href} className="text-muted-foreground hover:text-foreground">{label}</Link>;
  const icon = "grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <>
      <div className="flex min-w-0 items-center gap-5 md:gap-7">
        {/* Phones show the mark alone; wider screens pair it with the wordmark (D-34). */}
        <Link href="/map" aria-label="Mapwich" className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <LogoMark size={30} />
          <span className="hidden md:inline">Mapwich</span>
        </Link>
        <nav aria-label="Sections" className="flex gap-4 text-sm md:gap-5">
          {nav("/map", "Map", "map")}
          {nav("/specials", "Specials", "specials")}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        {onSearch ? (
          <button type="button" onClick={onSearch} aria-label="Search places and datasets" title="Search places and datasets ( / )" className={icon}>
            <Search className="size-[18px]" aria-hidden />
          </button>
        ) : (
          <Link href="/data" aria-label="Search datasets" className={icon}><Search className="size-[18px]" aria-hidden /></Link>
        )}
        <SettingsMenu theme={explicitTheme} onTheme={(t) => { if (!t) forgetTheme(); onTheme(t); }} unit={unit} onUnit={onUnit} />
      </div>
    </>
  );
}

const noSubscribe = () => () => {};
/** ?theme=, else the remembered choice, else null (follow the system). */
const readExplicit = (): ThemeName | null => {
  const p = new URLSearchParams(window.location.search).get("theme");
  return p === "light" || p === "dark" ? p : readStoredTheme();
};

/** Header for every page except the map. */
export function SiteHeader({ current }: { current?: Section }) {
  // The server can't see the explicit choice (undefined there); the layout script has already
  // applied it before paint, so nothing flashes while the client catches up.
  const initial = useSyncExternalStore(noSubscribe, readExplicit, () => undefined);
  // undefined = no choice made on this page yet; null = "System".
  const [chosen, setChosen] = useState<ThemeName | null | undefined>(undefined);
  return (
    <header className="sticky top-0 z-30 flex h-14 print:hidden items-center justify-between gap-3 border-b bg-background px-4 md:px-6">
      {initial !== undefined ? <ThemedContent current={current} explicit={chosen === undefined ? initial : chosen} onTheme={setChosen} />
        : <HeaderContent current={current} explicitTheme={null} onTheme={() => {}} />}
    </header>
  );
}

function ThemedContent({ current, explicit, onTheme }: { current?: Section; explicit: ThemeName | null; onTheme: (t: ThemeName | null) => void }) {
  useResolvedTheme(explicit);
  return <HeaderContent current={current} explicitTheme={explicit} onTheme={onTheme} />;
}
