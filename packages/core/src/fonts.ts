export type FontSlot = "sans" | "heading" | "mono";

export type FontSourceKind = "bundled" | "fontsource" | "system";

/**
 * A font preference for one slot (body/"sans" or code/"mono").
 * - "bundled": the app's default (Geist Sans / Geist Mono), no fetch needed.
 * - "fontsource": fetch+cache `fontsourceId` from the Fontsource CDN (a
 *   curated pick or a user-typed custom id — same mechanism either way).
 * - "system": use `systemFamily` verbatim as the CSS font-family, relying on
 *   whatever's installed on the OS. No fetch, no cache.
 */
export interface FontPreference {
  kind: FontSourceKind;
  fontsourceId?: string;
  systemFamily?: string;
}

export const DEFAULT_FONT_PREFERENCE: FontPreference = { kind: "bundled" };
