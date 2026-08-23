import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A plain browser build of the editor — no Tauri, no desktop-specific
// chrome (native menu, window title, fs-backed image/font hosts). Exists
// so AmaranthaEditor can be exercised in a normal browser: for visual
// verification of UI work without ad-hoc Tauri-IPC stubbing per session,
// and as the seed for the eventual VS Code / Chrome-extension reader,
// which will need the same Tauri-free host shape.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: [
      // More specific subpath alias must come first: Vite/Rollup's alias
      // matcher tries string keys in order and treats them as prefixes, so
      // "@amarantha/theme" would otherwise shadow "@amarantha/theme/index.css".
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

  // Deliberately a different port than packages/desktop's fixed 1420/1421
  // (those are pinned for `tauri dev`) so both can run at once.
  server: {
    port: 4300,
    strictPort: true,
  },
});
