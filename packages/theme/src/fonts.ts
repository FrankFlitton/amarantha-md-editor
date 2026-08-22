import type { FontSlot } from "@amarantha/core";

export interface CuratedFont {
  /** Fontsource package id — https://api.fontsource.org/v1/fonts/{id}. */
  id: string;
  label: string;
  slot: FontSlot;
}

/**
 * A short, opinionated shortlist — not the full ~2000-font Fontsource
 * catalog. Anything else is reachable via the "custom Fontsource ID" field,
 * which fetches+caches through the exact same mechanism as these.
 */
export const CURATED_FONTS: CuratedFont[] = [
  { id: "inter", label: "Inter", slot: "sans" },
  { id: "manrope", label: "Manrope", slot: "sans" },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", slot: "sans" },
  { id: "space-grotesk", label: "Space Grotesk", slot: "sans" },
  { id: "work-sans", label: "Work Sans", slot: "sans" },
  { id: "jetbrains-mono", label: "JetBrains Mono", slot: "mono" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", slot: "mono" },
  { id: "space-mono", label: "Space Mono", slot: "mono" },
  { id: "fira-code", label: "Fira Code", slot: "mono" },
];
