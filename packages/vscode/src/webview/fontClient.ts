import type { FontPreference, FontSlot } from "@amarantha/core";
import { bridge } from "./vscodeBridge";

// "heading" has no bundled font of its own — falls back to the same Geist
// Sans as the body, matching packages/desktop/src/lib/fontHost.ts.
const BUNDLED_FAMILY: Record<FontSlot, string> = {
  sans: "Geist Variable",
  heading: "Geist Variable",
  mono: "Geist Mono Variable",
};

const SYSTEM_FALLBACK: Record<FontSlot, string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  heading: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

// Dedupes <style data-amarantha-font> injection per fontsource id within a session.
const injectedFontIds = new Set<string>();

/**
 * Resolves a FontPreference to a CSS font-family value. "bundled" and
 * "system" are pure string concatenation, resolved entirely client-side —
 * only "fontsource" needs the extension host round trip (real network fetch
 * + persistent cache, which a webview can't do on its own).
 */
export async function resolveFontFamily(preference: FontPreference, slot: FontSlot): Promise<string> {
  if (preference.kind === "system" && preference.systemFamily) {
    return `"${preference.systemFamily}", ${SYSTEM_FALLBACK[slot]}`;
  }
  if (preference.kind === "fontsource" && preference.fontsourceId) {
    const { family, fontFaceCss } = await bridge.requestFont(slot, preference);
    if (fontFaceCss && !injectedFontIds.has(preference.fontsourceId)) {
      injectedFontIds.add(preference.fontsourceId);
      const styleTag = document.createElement("style");
      styleTag.dataset.amaranthaFont = preference.fontsourceId;
      styleTag.textContent = fontFaceCss;
      document.head.appendChild(styleTag);
    }
    return `"${family}", ${SYSTEM_FALLBACK[slot]}`;
  }
  return `"${BUNDLED_FAMILY[slot]}", ${SYSTEM_FALLBACK[slot]}`;
}
