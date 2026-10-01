// Minimal top-level navigation for non-map pages (navigation redesign is coming).
export function SiteNav({ current }: { current: "map" | "data" | "insights" }) {
  const link = (href: string, label: string, key: typeof current) => (
    <a href={href} aria-current={current === key ? "page" : undefined}
      className={current === key ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}>{label}</a>
  );
  return (
    <nav aria-label="Sections" className="mb-6 flex items-center gap-4 text-sm">
      <a href="/" className="mr-2 font-semibold tracking-tight text-foreground">webgis</a>
      {link("/", "Map", "map")}
      {link("/data", "Data", "data")}
      {link("/insights", "Weird Insights", "insights")}
    </nav>
  );
}
