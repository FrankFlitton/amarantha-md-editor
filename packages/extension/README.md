# @amarantha/extension

A Manifest V3 Chrome extension that renders any raw `.md`, `.mdx`, `.markdown`, or `.txt` file you land on across the web — a GitHub raw link, a gist, a doc served straight off S3 — with Amarantha's rich view, instead of Chrome's plain-text viewer. Opens read-only; an **Edit** toggle unlocks in-place editing, and **Save** downloads the edited text as a local file under its original name. Nothing ever writes back to the page it came from — there's no file-system access here, by design; that's the native desktop app's job. Settings (theme, appearance, text size, an on/off switch) live in `options.html`.

## How it decides when to render

`manifest.json`'s `content_scripts` matches any URL ending in `.md`, `.mdx`, `.markdown`, or `.txt` over http/https (`*://*/*.md` etc.) or a local file (`file:///*.md` etc.) — `*://` only ever expands to `http`/`https` in Chrome's match-pattern syntax, never `file:`, so the `file:///` variant of each is required separately for `file:///path/to/doc.md` links to match at all. (Chrome match patterns don't support alternation in the path — `*.{md,mdx}` isn't valid — so each extension needs its own literal entry, times two for the `file:///` scheme; adding another extension means adding another pair of strings here.) That still includes pages like GitHub's `/blob/main/README.md` UI, which is real HTML, not a raw file. The content script (`src/content/detect.ts`) only takes over when the page is actually raw text — `document.contentType` is `text/plain`/`text/markdown`, or (content type unset) the whole `<body>` is Chrome's own single generated `<pre>` wrapper — and that check is the same regardless of which of the four extensions matched; a `.txt` or `.mdx` file gets rendered exactly like a `.md` one. Anything else is left untouched.

**Local `file://` links need one extra, manual step**: Chrome never grants an extension file-URL access via the manifest alone, regardless of `matches` — go to `chrome://extensions`, open this extension's **Details**, and turn on **Allow access to file URLs**. Without that toggle the content script is never injected into `file://` pages at all, silently.

That toggle only covers *injection*, though — it doesn't make `file:` fetchable. `fetchRawText` (`detect.ts`) normally re-fetches the page's own URL to get the raw text, but Chrome's `fetch()` implementation has a fixed scheme allowlist (its own error names it: "brave, chrome, chrome-extension, chrome-untrusted, data, http, https, isolated-app") that `file` was never part of — no permission, host or otherwise, changes that; it's a hard wall in Fetch itself, not an access-control check. For `file:` URLs `fetchRawText` reads the already-rendered DOM instead: Chrome's local text-file viewer is the same single generated `<pre>` wrapper `isRawMarkdownDocument` checks for below, already holding the exact file bytes before this content script does anything to the page.

Once confirmed raw, it re-fetches the same URL (byte-exact, not `.innerText`, which collapses whitespace), clears the page, and mounts `AmaranthaEditor` inside a Shadow DOM (`src/content/main.tsx`) — isolating Amarantha's styling from whatever the host page might otherwise contribute, and keeping the extension's own injected CSS from leaking back out.

**Every CSS file has to be collected and inlined by hand.** `@amarantha/theme`'s and `@mdxeditor/editor`'s stylesheets are real npm-package exports, imported with a `?inline` suffix and manually concatenated into the one `<style>` tag this shadow root gets. `@amarantha/editor`'s *own* component CSS (the vendored toolbar/select fork, source view, inline-editable text, frontmatter, JSX/Mermaid editors) is different: none of it is re-exported through the package's entry point, it's just plain side-effect `import "./x.css"` statements inside individual components. web/vscode/desktop never import those explicitly either — their normal (non-lib) Vite builds auto-collect every CSS side-effect import reachable from the app and link the result into their own generated `index.html`. A content script has no HTML page for Vite to inject a `<link>` into; `vite.content.config.ts`'s `cssCodeSplit: false` just dumps all of it into one `dist/extension.css` file that nothing then loads (`manifest.json`'s `content_scripts` has no matching `"css"` entry) — it silently never reaches the page. `main.tsx` imports each of those six files by relative path with `?inline` and adds them to the same concatenated `<style>` tag for exactly this reason; forgetting one here means that component renders with zero layout/color styling (browser-default flex/block flow) the moment it's actually used, however correct its React code is.

## Try it (load unpacked)

1. `npm run build --workspace @amarantha/extension` from the repo root. Output lands in `packages/extension/dist/`.
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `packages/extension/dist`.
3. Visit any raw `.md` URL (e.g. a `raw.githubusercontent.com/.../README.md` link) — it should render immediately.
4. Click the toolbar icon to open settings (`options.html`), or right-click it → **Options**.

Re-run the build and click the refresh icon on the extension's card in `chrome://extensions` after any source change — Chrome doesn't hot-reload unpacked extensions.

## Editing and saving

- **Edit** toggles the page between locked (read-only) and editable — same Rich/Source toggle either way, since both modes forward `readOnly` down to `@amarantha/editor`.
- **Save** downloads the current buffer under its original filename (extension included, whichever of `.md`/`.mdx`/`.markdown`/`.txt` it was), via a `Blob` + object URL + synthetic `<a download>` click (`src/content/download.ts`) — the same mechanism any web page uses to offer a file download, not `chrome.downloads` or the File System Access API. It's disabled until the buffer actually differs from what was last saved.
- Edits never reach the original page or its server — there's nothing to write back to, and no permission requested that would let this extension do so. A dirty buffer also guards a same-tab `beforeunload` and intercepts Cmd/Ctrl+S so it triggers this Save instead of Chrome's own "Save Page As" (which would otherwise save the extension's injected HTML shell, not the markdown).
- Toggling Edit, or switching Rich ⇄ Source, remounts `AmaranthaEditor` (`key={mode}:{editing}`) rather than relying on prop reactivity — `value` (`SourceView`) and `readOnly` (MDXEditor's `corePlugin` init) are both seed-once inputs there, the same contract every other host in this repo already works around via a `key` change.

## What's wired up

- `src/content/` — detection + fetch + Shadow-DOM mount of `AmaranthaEditor` (Rich/Source toggle, Edit/Save bar).
- `src/options/` — settings form (enable toggle, theme family, light/dark/system, text size) with a live read-only preview using the same `AmaranthaEditor`.
- `src/lib/settings.ts` — `chrome.storage.sync`-backed settings, shared by both.
- `src/background.ts` — the toolbar icon has no popup; a one-line service worker opens `options.html` on click.
- `readOnly` is a prop on `@amarantha/editor`'s `AmaranthaEditor`/`SourceView` (forwards MDXEditor's own public `readOnly` prop, and a CodeMirror `EditorState.readOnly`/`EditorView.editable` pair for source mode) — added for this package, but it's a plain optional prop so every other host is unaffected.

## Lazy-loading Mermaid

`content.js` is one static IIFE — a Chrome `content_scripts` entry has to be, there's no per-page code-splitting the way a normal web app's bundler gets for free. That ruled out the obvious fix for the biggest chunk of bundle weight: Mermaid alone drags in ~3.3MB of transitive dependencies (cytoscape, katex, ~25 per-diagram-type chunks) that most `.md` files never touch.

`@amarantha/editor`'s `MermaidDiagram` already lazy-loads mermaid via a plain `import("mermaid")`, on first actual use — that's enough for web/VS Code/desktop, whose bundlers emit it as a same-origin chunk a relative dynamic import can reach. It's not enough here: `content.js` is a classic (non-module) script, so a bare dynamic import inside it resolves against the *host page's* origin, not the extension's own files, and 404s.

The fix is two builds instead of one:

- `vite.content.config.ts` marks `mermaid` `external` — Rollup stops walking into its module graph entirely, so `content.js` never contains Mermaid, cytoscape, or KaTeX (down from ~7MB to ~3.6MB).
- `vite.content-lazy.config.ts` builds `dist/lazy/mermaid-chunk.js` as an actual ES module (not IIFE), with code-splitting left on — so Mermaid's own per-diagram-type dynamic imports become real sibling chunks in `dist/lazy/`, fetched only for diagrams a document actually uses.
- `main.tsx` calls `@amarantha/editor`'s `setMermaidLoader()` before mounting anything, pointing it at `import(chrome.runtime.getURL("lazy/mermaid-chunk.js"))`. An absolute `chrome-extension://` URL sidesteps the page-origin problem; loading it as a real ES module (rather than injecting it as another classic script) is what lets *its* relative imports resolve against itself and reach the sibling chunks.
- `manifest.json` declares `dist/lazy/*.js` under `web_accessible_resources` — Chrome refuses to fetch a `chrome-extension://` URL from page/content-script context otherwise, silently.

Net effect: a `.md` file with no Mermaid in it never downloads any of that ~4.7MB `dist/lazy/` tree. One that does pays for Mermaid's core plus only the diagram types it actually renders.

## Known trade-offs, not yet addressed

- The `*://*/*.{md,mdx,markdown,txt}` match patterns are declared statically in `manifest.json`, so Chrome grants that host access at install time — there's no optional-permission prompt flow. Narrower than `<all_urls>`, but still every http/https host.
- Toggling Edit or switching Rich ⇄ Source remounts the editor, which resets undo history — acceptable for a lightweight web-page editor, but worth knowing before a long editing session.
- Not published to the Chrome Web Store — load-unpacked only, per the workflow above.
