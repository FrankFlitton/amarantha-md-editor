import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds dist/lazy/mermaid-chunk.js — mermaid (plus its own dependency tree:
// cytoscape, katex, ...) as a real ES module with code-splitting left on,
// separate from content.js's single-file IIFE. content.js never bundles
// mermaid at all (see vite.content.config.ts's `external`); it fetches this
// chunk on demand instead, via `chrome.runtime.getURL` (main.tsx) — see
// setMermaidLoader in @amarantha/editor for why a plain relative dynamic
// import doesn't work from a content script. Must run after build:content,
// since content.js's own build empties the whole dist/ directory.
export default defineConfig({
  // Same reasoning as vite.content.config.ts: build.lib output skips Vite's
  // normal process.env.NODE_ENV replacement, and this chunk loads into the
  // same process-less content-script world. Mermaid itself doesn't branch on
  // it, but this guards any dependency that does.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },

  build: {
    outDir: "dist/lazy",
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, "src/content/lazy/mermaid-entry.ts"),
      formats: ["es"],
      fileName: () => "mermaid-chunk.js",
    },
    rollupOptions: {
      output: {
        // Fixed pattern (not the content-hashed default) so manifest.json's
        // web_accessible_resources glob ("lazy/*.js") can name it statically.
        chunkFileNames: "mermaid-chunk-[name].js",
      },
    },
  },
});
