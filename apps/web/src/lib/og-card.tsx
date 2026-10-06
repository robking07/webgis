// The 1200x630 link-preview card (issue #37): Mapwich name, a page title and a one-line summary.
// Colors come from the light theme tokens in @webgis/design; the font is Public Sans (bundled
// woff files in src/assets/fonts, SIL OFL), the same face as the site. Cards are static or computed from
// data shipped in the build, so nothing is fetched at share time.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEMES } from "@webgis/design";

export const OG_SIZE = { width: 1200, height: 630 };
const T = THEMES.light;

const font = (name: string) => readFile(join(process.cwd(), "src/assets/fonts", name));
const fonts = () =>
  Promise.all([
    font("public-sans-latin-400-normal.woff"),
    font("public-sans-latin-700-normal.woff"),
  ]).then(([r, b]) => [
    { name: "Public Sans", data: r, weight: 400 as const, style: "normal" as const },
    { name: "Public Sans", data: b, weight: 700 as const, style: "normal" as const },
  ]);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function ogCard({ kicker, title, summary }: { kicker: string; title: string; summary: string }) {
  const long = title.length > 48;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "Public Sans", background: T.ui.bg, color: T.ui.text, padding: "64px 72px", borderLeft: `24px solid ${T.ui.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke={T.ui.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="32" y1="8" x2="32" y2="27" />
            <path d="M9 27 L32 15.5 L55 27 L32 38.5 Z" fill={T.ui.text} stroke="none" />
            <line x1="32" y1="15.5" x2="32" y2="27" stroke={T.ui.bg} />
            <path d="M10 35 L32 46 L54 35" />
            <line x1="32" y1="47" x2="32" y2="56" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>Mapwich</div>
          <div style={{ fontSize: 28, color: T.ui.textMuted, marginLeft: "auto" }}>{kicker}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: long ? 64 : 80, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>{clip(title, 90)}</div>
          <div style={{ display: "flex", fontSize: 34, lineHeight: 1.3, color: T.ui.textMuted }}>{clip(summary, 150)}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: T.ui.accent, fontWeight: 600 }}>mapwich.org</div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
