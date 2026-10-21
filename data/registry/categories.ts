// Dataset categories and their subcategories, in display order (Robbie, 2026-10-13, issue #199).
// Plain data with no zod, so the web app can import it without pulling in the schema.
export const CATEGORY_TREE = {
  "People": ["Population and age", "Race and ethnicity", "Education", "Immigration and language"],
  "Economy": ["Income and poverty", "Jobs", "Internet access"],
  "Housing": ["Costs", "Homes"],
  "Health": ["Conditions", "Behaviors", "Care and coverage", "Disability", "Daily needs", "Food access", "Environmental justice"],
  "Transportation": ["Commuting", "Roads and vehicles", "Traffic safety"],
  "Environment and climate": ["Climate", "Natural hazards", "Air quality", "Toxic releases", "Energy burden", "Social vulnerability"],
} as const satisfies Record<string, readonly string[]>;

export type Category = keyof typeof CATEGORY_TREE;
export const CATEGORIES = Object.keys(CATEGORY_TREE) as [Category, ...Category[]];
