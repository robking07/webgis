// Footer for non-map pages. The header for every page is SiteHeader (D-33, P1); the data directory
// is reached from the dataset card, "About this data", the header search, and this footer.
import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <Link href="/data" className="hover:text-foreground">All datasets</Link>
      <Link href="/design-system" className="hover:text-foreground">Design system</Link>
      <a href="https://buymeacoffee.com/mapwich" target="_blank" rel="noopener" className="hover:text-foreground">Buy me a coffee</a>
      <span>Mapwich is a non-commercial, educational project.</span>
    </footer>
  );
}
