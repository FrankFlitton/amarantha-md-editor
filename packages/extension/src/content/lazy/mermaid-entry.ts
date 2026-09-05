// Built by vite.content-lazy.config.ts into dist/lazy/mermaid-chunk.js — an
// actual ES module, unlike content.js's IIFE. Loaded at runtime via
// `import(chrome.runtime.getURL("lazy/mermaid-chunk.js"))` (see main.tsx),
// which is why this has to be its own build: an ES module's *own* relative
// imports resolve against its own URL, so mermaid's internal per-diagram-type
// dynamic imports correctly reach their sibling chunks in dist/lazy/ once
// this file itself was loaded from a chrome-extension:// URL. content.js,
// being a classic script, doesn't get that — see setMermaidLoader's docstring.
export { default } from "mermaid";
