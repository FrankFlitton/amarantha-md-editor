/**
 * Every curated font (@amarantha/theme's CURATED_FONTS) bundled directly
 * into the webview build — single weight (400/normal/latin, matching what
 * the extension-host Fontsource fetch path also requests), same pattern as
 * the default Geist font already imported in main.tsx. Loaded via dynamic
 * import() rather than an eager top-level import so unselected fonts don't
 * bloat the initial bundle; each entry must stay a literal string import
 * specifier (not built from a template/variable) for Vite's bundler to
 * statically discover and code-split it.
 *
 * This exists specifically to route around the extension-host
 * fetch→cache→asWebviewUri round trip real Fontsource IDs need (fontHost.ts) —
 * confirmed working in isolation (a live browser test proved the --am-font-*
 * CSS mechanism itself is sound), but the live VS Code round trip could not
 * be confirmed working end-to-end, and bundling sidesteps it entirely for
 * every font actually offered in the picker's dropdown list. The free-text
 * "Custom Fontsource ID…" field still goes through that round trip — it
 * has to, for an arbitrary id we can't have pre-bundled.
 *
 * Each loader's resolved font-family name is verified to exactly match
 * @amarantha/theme's CURATED_FONTS label for that id (checked against the
 * real shipped CSS in each package, not assumed) — see fontClient.ts.
 */
export const BUNDLED_FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  inter: () => import("@fontsource/inter/400.css"),
  manrope: () => import("@fontsource/manrope/400.css"),
  "ibm-plex-sans": () => import("@fontsource/ibm-plex-sans/400.css"),
  "space-grotesk": () => import("@fontsource/space-grotesk/400.css"),
  "work-sans": () => import("@fontsource/work-sans/400.css"),
  "libre-baskerville": () => import("@fontsource/libre-baskerville/400.css"),
  "playfair-display": () => import("@fontsource/playfair-display/400.css"),
  "jetbrains-mono": () => import("@fontsource/jetbrains-mono/400.css"),
  "ibm-plex-mono": () => import("@fontsource/ibm-plex-mono/400.css"),
  "space-mono": () => import("@fontsource/space-mono/400.css"),
  "fira-code": () => import("@fontsource/fira-code/400.css"),
};
