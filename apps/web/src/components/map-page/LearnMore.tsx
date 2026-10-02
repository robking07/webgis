import { ArrowUpRight } from "lucide-react";
import type { Link } from "@/lib/learn-more";

/** Readable resources about this place or feature (not the metadata). */
export function LearnMore({ links }: { links: Link[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-3 border-t pt-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Learn more</p>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener" className="inline-flex items-start gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline">
              {l.label} <ArrowUpRight className="mt-px size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
