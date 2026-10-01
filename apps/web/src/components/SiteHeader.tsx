"use client";
// One header for every page (D-33, P1): wordmark, Map · Specials, dataset search, theme toggle.
// The map wraps HeaderContent in its own header (it falls away when immersed and opens the dataset
// browser); every other page uses SiteHeader, where search goes to the data directory.
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Moon, Search, Sun } from "lucide-react";
import type { ThemeName } from "@webgis/design";
import { readStoredTheme, useResolvedTheme } from "@/lib/theme";
import { LogoMark } from "./Logo";

type Section = "map" | "specials";

export function HeaderContent({ current, onSearch, theme, onTheme }: {
  current?: Section;
  /** Opens the dataset browser (map). Without it, search links to the data directory. */
  onSearch?: () => void;
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
}) {
  const nav = (href: string, label: string, key: Section) => current === key
    ? <Link href={href} aria-current="page" className="font-semibold text-foreground shadow-[inset_0_-2px_0_var(--ui-accent)]">{label}</Link>
    : <Link href={href} className="text-muted-foreground hover:text-foreground">{label}</Link>;
  const searchWide = "hidden h-9 w-72 items-center gap-2 rounded-md border bg-card px-3 text-left text-sm text-muted-foreground hover:text-foreground md:flex focus-visible:outline-2 focus-visible:outline-ring";
  const searchIcon = "grid size-9 place-items-center rounded-md border bg-card text-muted-foreground md:hidden focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <>
      <div className="flex min-w-0 items-center gap-5 md:gap-7">
        {/* Phones show the mark alone; wider screens pair it with the wordmark (D-34). */}
        <Link href="/" aria-label="Mapwich" className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <LogoMark size={30} />
          <span className="hidden md:inline">Mapwich</span>
        </Link>
        <nav aria-label="Sections" className="flex gap-4 text-sm md:gap-5">
          {nav("/", "Map", "map")}
          {nav("/specials", "Specials", "specials")}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {onSearch ? (
          <>
            <button type="button" onClick={onSearch} className={searchWide}><Search className="size-4" aria-hidden /> Search datasets</button>
            <button type="button" onClick={onSearch} aria-label="Search datasets" className={searchIcon}><Search className="size-4" aria-hidden /></button>
          </>
        ) : (
          <>
            <Link href="/data" className={searchWide}><Search className="size-4" aria-hidden /> Search datasets</Link>
            <Link href="/data" aria-label="Search datasets" className={searchIcon}><Search className="size-4" aria-hidden /></Link>
          </>
        )}
        <ThemeToggle theme={theme} onChange={onTheme} />
      </div>
    </>
  );
}

export function ThemeToggle({ theme, onChange }: { theme: ThemeName; onChange: (t: ThemeName) => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => onChange(next)} aria-label={`Switch to ${next} theme`}
      className="grid size-9 place-items-center rounded-md border text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
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
  const [chosen, setChosen] = useState<ThemeName | null>(null);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      {initial !== undefined ? <ThemedContent current={current} explicit={chosen ?? initial} onTheme={setChosen} />
        : <HeaderContent current={current} theme="light" onTheme={() => {}} />}
    </header>
  );
}

function ThemedContent({ current, explicit, onTheme }: { current?: Section; explicit: ThemeName | null; onTheme: (t: ThemeName) => void }) {
  const theme = useResolvedTheme(explicit);
  return <HeaderContent current={current} theme={theme} onTheme={onTheme} />;
}
