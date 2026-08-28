import type { FontSlot } from "@amarantha/core";

export interface CuratedFont {
  /** Fontsource package id — https://api.fontsource.org/v1/fonts/{id}. */
  id: string;
  label: string;
  /** Every slot this font is offered for. Body and heading share the same
   *  pool (a picker offering only sans-serif for body and only serif for
   *  heading made it impossible to pick one typeface — e.g. a serif — for
   *  both, which is a normal thing to want); mono stays its own pool since
   *  a proportional font doesn't serve the "code font" use case. */
  slots: FontSlot[];
}

const PROSE_SLOTS: FontSlot[] = ["sans", "heading"];

/**
 * A short, opinionated shortlist — not the full ~2000-font Fontsource
 * catalog. Anything else is reachable via the "custom Fontsource ID" field,
 * which fetches+caches through the exact same mechanism as these.
 */
export const CURATED_FONTS: CuratedFont[] = [
  { id: "inter", label: "Inter", slots: PROSE_SLOTS },
  { id: "manrope", label: "Manrope", slots: PROSE_SLOTS },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", slots: PROSE_SLOTS },
  { id: "space-grotesk", label: "Space Grotesk", slots: PROSE_SLOTS },
  { id: "work-sans", label: "Work Sans", slots: PROSE_SLOTS },
  { id: "libre-baskerville", label: "Libre Baskerville", slots: PROSE_SLOTS },
  { id: "playfair-display", label: "Playfair Display", slots: PROSE_SLOTS },
  { id: "jetbrains-mono", label: "JetBrains Mono", slots: ["mono"] },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", slots: ["mono"] },
  { id: "space-mono", label: "Space Mono", slots: ["mono"] },
  { id: "fira-code", label: "Fira Code", slots: ["mono"] },
];
