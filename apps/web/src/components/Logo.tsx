// The Mapwich mark (D-34, amended 2026-10-05): a solid map layer and one open layer line below it, in one
// ink color, with a toothpick through the middle that is cut out where it crosses the solid layer.
// Color is the theme text token, so it follows light/dark. The same drawing, with fixed colors, is the
// favicon (app/icon.svg) and the share cards (lib/og-card.tsx); keep them in sync.
// Strokes are 4 on a 64 grid (about 1.5px at 24px) so lines stay crisp at 16-30px.
import { useId } from "react";

export function LogoMark({ size = 24, title, ink = "var(--ui-text)" }: { size?: number; title?: string; ink?: string }) {
  const cut = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      className="shrink-0" focusable="false" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {/* The cut-out is a mask, so it shows whatever is behind the mark (page or panel). */}
      <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
        <rect width="64" height="64" fill="#fff" stroke="none" />
        <line x1="32" y1="15.5" x2="32" y2="27" stroke="#000" />
      </mask>
      {/* The pick stops at the layer edge; inside the layer it shows only as the cut-out. */}
      <line x1="32" y1="8" x2="32" y2="13.5" />
      <path d="M9 27 L32 15.5 L55 27 L32 38.5 Z" fill={ink} stroke="none" mask={`url(#${cut})`} />
      <path d="M10 35 L32 46 L54 35" />
      <line x1="32" y1="47" x2="32" y2="56" />
    </svg>
  );
}
