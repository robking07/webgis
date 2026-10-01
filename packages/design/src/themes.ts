// Light and dark themes. UI chrome and the basemap both read from these tokens;
// `scripts/check.ts` enforces the contrast pairs listed in `CONTRAST_RULES`.

export type ThemeName = "light" | "dark";

export interface Theme {
  name: ThemeName;
  ui: {
    bg: string;
    surface: string;
    surfaceRaised: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
    focus: string;
    danger: string;
  };
  map: {
    background: string;
    land: string;
    water: string;
    waterLine: string;
    park: string;
    road: string;
    roadMajor: string;
    boundary: string;
    boundaryMajor: string;
    label: string;
    labelMuted: string;
    labelHalo: string;
    /** Outline drawn around every choropleth polygon. */
    featureOutline: string;
    /** Outline for the hovered / selected feature. */
    highlight: string;
    /** Fill for features with no value. */
    noData: string;
    /** Reference overlays drawn above thematic fills (cased so they read over any fill). */
    interstate: string;
    interstateCasing: string;
    river: string;
    riverCasing: string;
    shieldText: string;
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    ui: {
      bg: "#f6f5f2",
      surface: "#ffffff",
      surfaceRaised: "#ffffff",
      border: "#d9d6cf",
      text: "#1b1c1e",
      textMuted: "#5b5d63",
      accent: "#1f5fa8",
      accentText: "#ffffff",
      focus: "#1f5fa8",
      danger: "#b3261e",
    },
    map: {
      background: "#f2f0eb",
      land: "#f2f0eb",
      water: "#c9d7e3",
      waterLine: "#a9bfd2",
      park: "#e4e8dc",
      road: "#ffffff",
      roadMajor: "#e6dfd2",
      boundary: "#a39f97",
      boundaryMajor: "#77736c",
      label: "#2e2f33",
      labelMuted: "#5f6168",
      labelHalo: "#ffffff",
      featureOutline: "#ffffff",
      highlight: "#111111",
      noData: "#d9d6cf",
      interstate: "#4a4d55",
      interstateCasing: "#ffffff",
      river: "#5b8fbf",
      riverCasing: "#eef4f9",
      shieldText: "#ffffff",
    },
  },
  dark: {
    name: "dark",
    ui: {
      bg: "#121316",
      surface: "#1b1d21",
      surfaceRaised: "#24272c",
      border: "#353941",
      text: "#ececee",
      textMuted: "#a3a6ad",
      accent: "#7fb2ec",
      accentText: "#0d1b2a",
      focus: "#7fb2ec",
      danger: "#f2b8b5",
    },
    map: {
      background: "#16181b",
      land: "#1c1e22",
      water: "#0f1a24",
      waterLine: "#1e3346",
      park: "#1d2420",
      road: "#2b2e34",
      roadMajor: "#383c43",
      boundary: "#4a4e56",
      boundaryMajor: "#6b707a",
      label: "#d4d6da",
      labelMuted: "#9a9ea6",
      labelHalo: "#16181b",
      featureOutline: "#16181b",
      highlight: "#ffffff",
      noData: "#3a3d43",
      interstate: "#c9ccd2",
      interstateCasing: "#16181b",
      river: "#6fa8dc",
      riverCasing: "#0f1a24",
      shieldText: "#16181b",
    },
  },
};

/** [foreground, background, minimum WCAG ratio, purpose] — checked for both themes. */
export const CONTRAST_RULES: Array<[keyof Theme["ui"] | `map.${keyof Theme["map"]}`, keyof Theme["ui"] | `map.${keyof Theme["map"]}`, number, string]> = [
  ["text", "bg", 7, "body text"],
  ["text", "surface", 7, "panel text"],
  ["textMuted", "surface", 4.5, "secondary text"],
  ["textMuted", "bg", 4.5, "secondary text on page"],
  ["accent", "surface", 4.5, "links and accent text"],
  ["accentText", "accent", 4.5, "text on accent buttons"],
  ["focus", "surface", 3, "focus ring (non-text)"],
  ["border", "surface", 1.3, "panel borders (decorative)"],
  ["map.label", "map.labelHalo", 7, "map labels"],
  ["map.labelMuted", "map.labelHalo", 4.5, "minor map labels"],
  ["map.highlight", "map.land", 3, "selection outline (non-text)"],
  ["map.interstate", "map.interstateCasing", 4.5, "interstate line vs its casing (non-text, reads over any fill)"],
  ["map.river", "map.riverCasing", 3, "river line vs its casing (non-text)"],
  ["map.shieldText", "map.interstate", 4.5, "interstate route number text"],
];

export function themeColor(theme: Theme, key: string): string {
  if (key.startsWith("map.")) return theme.map[key.slice(4) as keyof Theme["map"]];
  return theme.ui[key as keyof Theme["ui"]];
}

/** CSS custom properties for a theme: `--ui-text`, `--map-water`, … */
export function themeCssVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.ui)) vars[`--ui-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(theme.map)) vars[`--map-${kebab(k)}`] = v;
  return vars;
}
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
