import type { GlossaryTerm } from "@webgis/registry";
import glossary from "@/generated/glossary.json";

export const GLOSSARY = glossary as unknown as GlossaryTerm[];
export const TERM_BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));
