import type { ThemeFamily, ThemeId, ThemeMode, ProseSize } from "@amarantha/core";

export type { ThemeFamily, ThemeId, ThemeMode, ThemeModePreference, ProseSize } from "@amarantha/core";

export interface ThemeCatalogEntry {
  id: ThemeId;
  family: ThemeFamily;
  mode: ThemeMode;
  label: string;
}

/** Every theme this package ships tokens for — one row per §1 of docs/theming-and-config-plan.md. */
export const THEMES: ThemeCatalogEntry[] = [
  { id: "ember-light", family: "ember", mode: "light", label: "Ember (Light)" },
  { id: "ember-dark", family: "ember", mode: "dark", label: "Ember (Dark)" },
  { id: "minimal-light", family: "minimal", mode: "light", label: "Minimal (Light)" },
  { id: "minimal-dark", family: "minimal", mode: "dark", label: "Minimal (Dark)" },
  { id: "solarized-light", family: "solarized", mode: "light", label: "Solarized (Light)" },
  { id: "solarized-dark", family: "solarized", mode: "dark", label: "Solarized (Dark)" },
  { id: "matrix-light", family: "matrix", mode: "light", label: "Matrix (Light)" },
  { id: "matrix-dark", family: "matrix", mode: "dark", label: "Matrix (Dark)" },
  { id: "cream-light", family: "cream", mode: "light", label: "Cream (Light)" },
  { id: "cream-dark", family: "cream", mode: "dark", label: "Cream (Dark)" },
];

export const THEME_FAMILIES: { family: ThemeFamily; label: string }[] = [
  { family: "ember", label: "Ember" },
  { family: "minimal", label: "Minimal" },
  { family: "solarized", label: "Solarized" },
  { family: "matrix", label: "Matrix" },
  { family: "cream", label: "Cream" },
];

export function themeId(family: ThemeFamily, mode: ThemeMode): ThemeId {
  return `${family}-${mode}`;
}

export const PROSE_SIZES: { size: ProseSize; label: string }[] = [
  { size: "sm", label: "Small" },
  { size: "base", label: "Normal" },
  { size: "lg", label: "Large" },
  { size: "xl", label: "XL" },
  { size: "2xl", label: "2XL" },
];

export { CURATED_FONTS, type CuratedFont } from "./fonts";
