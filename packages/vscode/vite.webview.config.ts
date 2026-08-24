import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundles the webview's React app into dist/webview/{webview.js,webview.css}
// with fixed (non-hashed) filenames, since getHtmlForWebview.ts references
// them directly rather than parsing a build manifest. No index.html entry —
// the extension builds the HTML shell itself (nonce'd CSP, asWebviewUri) —
// so the entry is the .tsx file directly via rollupOptions.input.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: [
      // More specific subpath alias must come first — see packages/web/vite.config.ts.
      { find: "@amarantha/theme/index.css", replacement: path.resolve(__dirname, "../theme/src/index.css") },
      { find: "@amarantha/core", replacement: path.resolve(__dirname, "../core/src/index.ts") },
      { find: "@amarantha/editor", replacement: path.resolve(__dirname, "../editor/src/index.ts") },
      { find: "@amarantha/mdx", replacement: path.resolve(__dirname, "../mdx/src/index.ts") },
      { find: "@amarantha/theme", replacement: path.resolve(__dirname, "../theme/src/index.ts") },
    ],
  },
  optimizeDeps: {
    exclude: ["@amarantha/core", "@amarantha/editor", "@amarantha/mdx", "@amarantha/theme"],
  },

  build: {
    outDir: "dist/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/webview/main.tsx"),
      output: {
        entryFileNames: "webview.js",
        assetFileNames: (assetInfo) =>
          (assetInfo.names?.[0] ?? "").endsWith(".css") ? "webview.css" : "assets/[name]-[hash][extname]",
      },
    },
  },
});
