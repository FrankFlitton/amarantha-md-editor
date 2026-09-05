import type { Plugin } from "vite";

/**
 * Every @fontsource/@fontsource-variable package hardcodes `font-display:
 * swap` in its generated @font-face rules — there's no import flag to change
 * it; fontsource's own "Advanced" customizer just hands you a fully
 * hand-written @font-face block to paste in yourself, duplicating url()s and
 * unicode-ranges we'd otherwise get for free from the package. `swap` is
 * exactly what causes the visible "flash": the browser paints text
 * immediately in the fallback font, then swaps to the real one (Geist, or
 * whichever font packages/vscode/src/webview/bundledFonts.ts lazily loads)
 * the instant its woff2 finishes parsing — a visible re-flow/redraw of
 * already-on-screen text, however fast the font loads.
 *
 * `optional` fixes it: the browser gives a *cached* font one short window
 * (~100ms) to be ready, and otherwise commits to the fallback for that paint
 * permanently — no later swap once the network catches up. A plain
 * string-replace transform on the fontsource CSS itself (matched by `id`
 * containing "@fontsource", covering both `@fontsource/x` and
 * `@fontsource-variable/x`) is simpler and more robust than hand-duplicating
 * every @font-face rule ourselves, and needs no changes on a fontsource
 * version bump. Applies uniformly to every host's Vite config that adds it —
 * static imports (web/vscode/desktop's `import "@fontsource-variable/geist"`)
 * and bundledFonts.ts's dynamic `import("@fontsource/x/400.css")` calls both
 * go through this same transform hook, since Vite's plugin pipeline doesn't
 * distinguish between the two for a statically-analyzable specifier.
 */
export function fontDisplayOptional(): Plugin {
  return {
    name: "amarantha-font-display-optional",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("@fontsource") || !id.endsWith(".css")) return null;
      if (!code.includes("font-display: swap")) return null;
      return code.replaceAll("font-display: swap", "font-display: optional");
    },
  };
}
