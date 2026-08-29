# @amarantha/extension

A Manifest V3 Chrome extension that renders any raw `.md` file you land on across the web — a GitHub raw link, a gist, a doc served straight off S3 — with Amarantha's rich view, instead of Chrome's plain-text viewer. Read-only: nothing here writes back to the original page. Settings (theme, appearance, text size, an on/off switch) live in `options.html`.

## How it decides when to render

`manifest.json`'s `content_scripts` matches any URL ending in `.md` (`*://*/*.md`), but that includes pages like GitHub's `/blob/main/README.md` UI, which is real HTML, not a raw file. The content script (`src/content/detect.ts`) only takes over when the page is actually raw text — `document.contentType` is `text/plain`/`text/markdown`, or (content type unset) the whole `<body>` is Chrome's own single generated `<pre>` wrapper. Anything else is left untouched.

Once confirmed raw, it re-fetches the same URL (byte-exact, not `.innerText`, which collapses whitespace), clears the page, and mounts `AmaranthaEditor` inside a Shadow DOM (`src/content/main.tsx`) — isolating Amarantha's styling from whatever the host page might otherwise contribute, and keeping the extension's own injected CSS from leaking back out.

## Try it (load unpacked)

1. `npm run build --workspace @amarantha/extension` from the repo root. Output lands in `packages/extension/dist/`.
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `packages/extension/dist`.
3. Visit any raw `.md` URL (e.g. a `raw.githubusercontent.com/.../README.md` link) — it should render immediately.
4. Click the toolbar icon to open settings (`options.html`), or right-click it → **Options**.

Re-run the build and click the refresh icon on the extension's card in `chrome://extensions` after any source change — Chrome doesn't hot-reload unpacked extensions.

## What's wired up

- `src/content/` — detection + fetch + Shadow-DOM mount of the read-only `AmaranthaEditor` (Rich/Source toggle, no toolbar since read-only mode suppresses it).
- `src/options/` — settings form (enable toggle, theme family, light/dark/system, text size) with a live preview using the same `AmaranthaEditor`.
- `src/lib/settings.ts` — `chrome.storage.sync`-backed settings, shared by both.
- `src/background.ts` — the toolbar icon has no popup; a one-line service worker opens `options.html` on click.
- `readOnly` is a new prop on `@amarantha/editor`'s `AmaranthaEditor`/`SourceView` (forwards MDXEditor's own public `readOnly` prop, and a CodeMirror `EditorState.readOnly`/`EditorView.editable` pair for source mode) — added for this package, but it's a plain optional prop so every other host is unaffected.

## Known trade-offs, not yet addressed

- `content.js` bundles the full `AmaranthaEditor` (Mermaid, KaTeX, GFM tables, JSX rendering) as one ~7MB IIFE, since a Chrome `content_scripts` entry must be a single static file — no code-splitting into lazily-fetched chunks. It's loaded from local disk (not re-downloaded per page), but it's still a meaningfully heavier script than a plain Markdown-only renderer would need.
- The `*://*/*.md` match pattern is declared statically in `manifest.json`, so Chrome grants that host access at install time — there's no optional-permission prompt flow. Narrower than `<all_urls>`, but still every http/https host.
- Not published to the Chrome Web Store — load-unpacked only, per the workflow above.
