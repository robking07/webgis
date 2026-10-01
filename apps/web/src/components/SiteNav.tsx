// Footer for non-map pages. The header for every page is SiteHeader (D-33, P1); the data directory
// is reached from the dataset card, "About this data", the header search, and this footer.
export function SiteFooter() {
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <a href="/data" className="hover:text-foreground">All datasets</a>
      <span>Mapwich is a non-commercial, educational project.</span>
    </footer>
  );
}
