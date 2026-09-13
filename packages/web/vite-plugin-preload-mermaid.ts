import type { Plugin } from "vite";
import type { OutputAsset, OutputChunk } from "rollup";

/**
 * `import("mermaid")` in MermaidDiagram.tsx bundles d3 plus mermaid's own
 * parsing/rendering core into one chunk (~680KB unminified, ~170KB gzipped)
 * that's mandatory before any diagram type can render. Vite only
 * auto-injects modulepreload for chunks reachable from the initial HTML's
 * *static* import graph — a demand-loaded chunk like this one is, by
 * design, left to start fetching only once the app actually calls
 * import("mermaid"), i.e. after the main bundle has loaded, parsed, and
 * React has mounted and run MermaidDiagram's own prefetch effect. That's a
 * real, visible amount of serialized time before the fetch even begins.
 *
 * This app's demo document (see App.tsx) always renders a <Mermaid> block,
 * so — unlike a general library recommendation — unconditionally paying for
 * this chunk on every load of this specific app is a given, not a
 * tradeoff. Hardcoding a <link rel="modulepreload"> for it into the built
 * index.html lets the browser start fetching (and compiling) it in
 * parallel with the main bundle instead of waiting for all of that first.
 */
export function preloadMermaidChunk(): Plugin {
  return {
    name: "amarantha-preload-mermaid-chunk",
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const mermaidChunk = Object.values(bundle).find(
          (item): item is OutputChunk => item.type === "chunk" && item.name === "mermaid.core"
        );
        const html = bundle["index.html"];
        if (!mermaidChunk || !html || html.type !== "asset") return;

        const asset = html as OutputAsset;
        asset.source = String(asset.source).replace(
          "</head>",
          `  <link rel="modulepreload" href="/${mermaidChunk.fileName}">\n  </head>`
        );
      },
    },
  };
}
