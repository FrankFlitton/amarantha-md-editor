import type { FontPreference, FontSlot } from "@amarantha/core";
import { CURATED_FONTS } from "@amarantha/theme";
import { bridge } from "./vscodeBridge";
import { BUNDLED_FONT_LOADERS } from "./bundledFonts";

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

// Dedupes <style data-amarantha-font> injection / dynamic import per
// fontsource id within a session.
const injectedFontIds = new Set<string>();
const loadedBundledIds = new Set<string>();

/**
 * Resolves a FontPreference to a CSS font-family value.
 *  - "bundled"/"system" are pure string concatenation, resolved entirely
 *    client-side, no loading of any kind.
 *  - "fontsource" first checks BUNDLED_FONT_LOADERS: every font actually
 *    offered in the picker's dropdown is bundled directly into the webview
 *    build (import()), the same reliable mechanism the default Geist font
 *    already uses — no extension round trip, no asWebviewUri, no network at
 *    webview-runtime. Only a fontsourceId typed into the free-text "Custom
 *    Fontsource ID…" field (necessarily not pre-bundled) falls through to
 *    the extension-host fetch+cache round trip.
 */
export async function resolveFontFamily(preference: FontPreference, slot: FontSlot): Promise<string> {
  if (preference.kind === "system" && preference.systemFamily) {
    return `"${preference.systemFamily}", ${SYSTEM_FALLBACK[slot]}`;
  }
  if (preference.kind === "fontsource" && preference.fontsourceId) {
    const id = preference.fontsourceId;
    const bundledLoad = BUNDLED_FONT_LOADERS[id];
    if (bundledLoad) {
      if (!loadedBundledIds.has(id)) {
        loadedBundledIds.add(id);
        await bundledLoad();
      }
      const curated = CURATED_FONTS.find((font) => font.id === id);
      // CURATED_FONTS' label is confirmed (against each package's real
      // shipped CSS) to exactly match its font-family name — see
      // bundledFonts.ts. Falls back to the id itself only if this font were
      // ever added to BUNDLED_FONT_LOADERS without a matching CURATED_FONTS
      // entry, which shouldn't happen but shouldn't silently produce
      // `undefined` in the font stack either.
      return `"${curated?.label ?? id}", ${SYSTEM_FALLBACK[slot]}`;
    }

    const { family, fontFaceCss } = await bridge.requestFont(slot, preference);
    if (fontFaceCss && !injectedFontIds.has(id)) {
      injectedFontIds.add(id);
      const styleTag = document.createElement("style");
      styleTag.dataset.amaranthaFont = id;
      styleTag.textContent = fontFaceCss;
      document.head.appendChild(styleTag);
    }
    return `"${family}", ${SYSTEM_FALLBACK[slot]}`;
  }
  return `"${BUNDLED_FAMILY[slot]}", ${SYSTEM_FALLBACK[slot]}`;
}
