import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds options.html as a normal multi-asset page (hashed filenames are
// fine here, unlike the content script — this page loads itself via its own
// <script>/<link> tags, nothing external references fixed filenames).
export default defineConfig({
  root: path.resolve(__dirname, "src/options"),
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: [
      { find: "@amarantha/theme/index.css", replacement: path.resolve(__dirname, "../theme/src/index.css") },
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
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    rollupOptions: {
      // Vite's default entry lookup is index.html; this page is named
      // options.html to match manifest.json's options_ui.page directly.
      input: path.resolve(__dirname, "src/options/options.html"),
    },
  },

  server: {
    port: 4310,
    strictPort: true,
  },
});
