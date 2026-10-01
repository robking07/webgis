// Top-level navigation for non-map pages: Map and Specials (D-31). The data directory is
// reached from the dataset card, "About this data", and the footer.
export function SiteNav({ current }: { current?: "map" | "specials" }) {
  const link = (href: string, label: string, key: typeof current) => (
    <a href={href} aria-current={current === key ? "page" : undefined}
      className={current === key ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}>{label}</a>
  );
  return (
    <nav aria-label="Sections" className="mb-6 flex items-center gap-4 text-sm">
      <a href="/" className="mr-2 font-semibold tracking-tight text-foreground">Mapwich</a>
      {link("/", "Map", "map")}
      {link("/specials", "Specials", "specials")}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <a href="/data" className="hover:text-foreground">All datasets</a>
      <span>Mapwich is a non-commercial, educational project.</span>
    </footer>
  );
}
