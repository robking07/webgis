// The Mapwich mark: a map layer sandwiched between two slices of bread (D-34). Colors come from
// theme tokens (--ui-brand-bread, --ui-accent; seeds use the page ground), so it follows light/dark.
// The same drawing, with fixed colors, is the favicon (app/icon.svg).
export function LogoMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      className="shrink-0" focusable="false">
      {/* Top slice: a rounded crown with a flat underside, and three seeds. */}
      <path d="M3 10.6C3 6.9 7 4.4 12 4.4s9 2.5 9 6.2v.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="var(--ui-brand-bread)" />
      <ellipse cx="8.4" cy="8.3" rx="0.9" ry="0.55" fill="var(--ui-bg)" transform="rotate(-20 8.4 8.3)" />
      <ellipse cx="12" cy="7" rx="0.9" ry="0.55" fill="var(--ui-bg)" />
      <ellipse cx="15.6" cy="8.3" rx="0.9" ry="0.55" fill="var(--ui-bg)" transform="rotate(20 15.6 8.3)" />
      {/* The filling: two stacked map layers. */}
      <path d="M12 14.3l8 2.3-8 2.3-8-2.3z" fill="var(--ui-accent)" opacity="0.45" />
      <path d="M12 12.6l8 2.3-8 2.3-8-2.3z" fill="var(--ui-accent)" />
      {/* Bottom slice. */}
      <rect x="3" y="19.6" width="18" height="3" rx="1.5" fill="var(--ui-brand-bread)" />
    </svg>
  );
}
