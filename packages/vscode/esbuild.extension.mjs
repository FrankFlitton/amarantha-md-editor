import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: [path.resolve(__dirname, "src/extension.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  // .cjs, not .js: package.json has "type": "module" (matching this monorepo's
  // other packages), but VS Code's extension host loads `main` via require(),
  // and esbuild's cjs output uses module.exports/require — a plain .js file
  // under "type": "module" gets parsed as ESM regardless of its actual
  // contents, which is exactly the mismatch that broke activation. A .cjs
  // extension forces CommonJS interpretation independent of "type".
  outfile: path.resolve(__dirname, "dist/extension.cjs"),
  external: ["vscode"],
  sourcemap: true,
  // The engine packages have no build step of their own and are consumed as
  // raw TypeScript source (same convention as packages/desktop/vite.config.ts
  // and packages/web/vite.config.ts's resolve.alias) — esbuild bundles them
  // directly rather than expecting a prebuilt dist.
  alias: {
    "@amarantha/core": path.resolve(__dirname, "../core/src/index.ts"),
    "@amarantha/mdx": path.resolve(__dirname, "../mdx/src/index.ts"),
    "@amarantha/theme": path.resolve(__dirname, "../theme/src/index.ts"),
  },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("esbuild: watching src/extension.ts");
} else {
  await esbuild.build(options);
}
