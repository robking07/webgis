"use client";
// One header for every page (D-33, P1): logo and wordmark, Map · Specials, then (right-justified)
// a search icon and Settings (D-35). On the map, search opens the place + dataset search over the
// map and Settings adds map units. Every other page opens the same search; a pick opens the map (issue #438).
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ThemeName } from "@webgis/design";
import { forgetTheme, readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { searchHref } from "@/lib/url-state";
import { useIsPhone } from "./BottomSheet";
import { LogoMark } from "./Logo";
import { SearchIcon, SearchOverlay } from "./SearchOverlay";
import { SettingsMenu, type ScaleUnit } from "./SettingsMenu";

type Section = "map" | "specials";

export function HeaderContent({ current, onSearch, explicitTheme, onTheme, unit, onUnit }: {
  current?: Section;
  /** Opens the map's place + dataset search. Without it (off the map), the header opens its own copy. */
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
        {onSearch ? <SearchButton onClick={onSearch} className={icon} /> : <SiteSearch className={icon} />}
        <SettingsMenu theme={explicitTheme} onTheme={(t) => { if (!t) forgetTheme(); onTheme(t); }} unit={unit} onUnit={onUnit} />
      </div>
    </>
  );
}

const SearchButton = ({ onClick, className }: { onClick: () => void; className: string }) => (
  <button type="button" onClick={onClick} aria-label="Search places and datasets" title="Search places and datasets ( / )" className={className}>
    <SearchIcon />
  </button>
);

/** Off the map (issue #438): the map's own search, with "/" to open it; a pick opens the map there. */
function SiteSearch({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  const phone = useIsPhone();
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (href: string) => { setOpen(false); router.push(href); };
  return (
    <>
      <SearchButton onClick={() => setOpen(true)} className={className} />
      {open && <SearchOverlay full={phone} current={null} onClose={() => setOpen(false)}
        onPlace={(p) => go(searchHref(null, p))} onDataset={(d) => go(searchHref(d.id))} onBoth={(d, p) => go(searchHref(d.id, p))}
        // shortcut: an address opens the map framed on it, without the pin and tract details the map's own search adds; fine until someone asks.
        onAddress={(m) => go(searchHref(null, { lon: m.lon, lat: m.lat, sqmi: 0 }))} />}
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
