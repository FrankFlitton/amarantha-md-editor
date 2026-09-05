import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds the content script: a single self-contained IIFE (content.js) that
// Chrome injects, per manifest.json's content_scripts entry, into every page
// whose URL matches *://*/*.md. Same sibling-workspace alias pattern as
// packages/web/vite.config.ts and packages/vscode/vite.webview.config.ts.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // A Manifest V3 content script must be one static file Chrome loads and
  // validates as UTF-8 before injecting it. esbuild's default "utf8" charset
  // leaves KaTeX/Mermaid's raw Unicode math glyphs as literal multi-byte
  // sequences in the output — thousands of them, scattered through this
  // ~7MB bundle. "ascii" instead escapes every non-ASCII character to
  // \uXXXX, so the emitted file is 100% single-byte ASCII: still exactly
  // valid UTF-8, but removing any multi-byte sequence for a large-file
  // encoding check to trip on.
  esbuild: { charset: "ascii" },

  // Vite's normal `process.env.NODE_ENV` replacement is a plugin hooked into
  // its regular app build pipeline; `build.lib` output doesn't get it, since
  // library builds are meant to leave that decision to whatever bundles the
  // library next. There's no "next bundler" for a content script — this file
  // runs as-is, injected straight into a page that has no `process` global
  // at all, so react/react-dom's own `process.env.NODE_ENV === "production"`
  // dev/prod branch throws a bare ReferenceError the instant it evaluates.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },

  resolve: {
    alias: [
      // Regex, not a plain string: this content script imports the CSS with a
      // `?inline` suffix (to get it as a string to inject into a shadow root
      // — see src/content/main.tsx), and @rollup/plugin-alias's string `find`
      // only matches an exact specifier or one followed by "/", so
      // "...index.css?inline" would fall through past this entry to the bare
      // "@amarantha/theme" alias below and resolve to a broken path.
      {
        find: /^@amarantha\/theme\/index\.css(\?.*)?$/,
        // "$1" preserves the query suffix (e.g. "?inline") that the regex
        // captured — a plain string replacement would silently drop it,
        // which resolves the file correctly but skips Vite's ?inline CSS
        // handling entirely (the actual failure mode hit here).
        replacement: `${path.resolve(__dirname, "../theme/src/index.css")}$1`,
      },
      { find: "@amarantha/core", replacement: path.resolve(__dirname, "../core/src/index.ts") },
      { find: "@amarantha/editor", replacement: path.resolve(__dirname, "../editor/src/index.ts") },
      { find: "@amarantha/mdx", replacement: path.resolve(__dirname, "../mdx/src/index.ts") },
      { find: "@amarantha/source", replacement: path.resolve(__dirname, "../source/src/index.ts") },
      { find: "@amarantha/theme", replacement: path.resolve(__dirname, "../theme/src/index.ts") },
    ],
  },
  optimizeDeps: {
    exclude: ["@amarantha/core", "@amarantha/editor", "@amarantha/mdx", "@amarantha/source", "@amarantha/theme"],
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "src/content/main.tsx"),
      formats: ["iife"],
      name: "AmaranthaContentScript",
      fileName: () => "content.js",
    },
    rollupOptions: {
      // Excluded, not just deferred: without this, Rollup still walks into
      // mermaid's module graph (it's a statically-reachable `import("mermaid")`
      // inside @amarantha/editor's MermaidDiagram.tsx, even though the actual
      // call is dead code here) and — because of inlineDynamicImports below —
      // inlines the whole thing, cytoscape/katex included, straight back into
      // this one file. setMermaidLoader (called in main.tsx before mount)
      // means that fallback `import("mermaid")` never actually runs; marking
      // it external stops Rollup from bundling it on the strength of that.
      external: ["mermaid"],
      output: {
        // Belt-and-suspenders: "iife" already forbids code-splitting, but a
        // manifest content_scripts entry must be exactly one static file —
        // there is nowhere for a separately-emitted chunk to be fetched from.
        inlineDynamicImports: true,
      },
    },
  },
});
