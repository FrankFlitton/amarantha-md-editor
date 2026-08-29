import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The background service worker has no dependencies beyond the ambient
// `chrome` global — a plain ES module build (matching manifest.json's
// background.type: "module") is enough, no React/Tailwind involved.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/background.ts"),
      formats: ["es"],
      fileName: () => "background.js",
    },
  },
});
