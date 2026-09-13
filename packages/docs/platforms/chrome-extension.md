# Chrome Extension

`@amarantha/extension` is a Manifest V3 Chrome extension that renders any
raw `.md`, `.mdx`, `.markdown`, or `.txt` file you land on across the web —
a GitHub raw link, a gist, a doc served straight off S3 — with Amarantha's
rich view, instead of Chrome's plain-text viewer.

::: warning Not yet published
Not yet published to the Chrome Web Store.
:::

Opens read-only; an **Edit** toggle unlocks in-place editing, and **Save**
downloads the edited text as a local file under its original name. Nothing
ever writes back to the page it came from — there's no filesystem access
here, by design; that's the [desktop app](/platforms/desktop)'s job.

## How it decides when to render

`manifest.json`'s `content_scripts` matches any URL ending in `.md`, `.mdx`,
`.markdown`, or `.txt` over http/https, or a local `file:///` URL (each
extension needs its own literal pattern for both schemes — Chrome match
patterns don't support path alternation, and `*://` never expands to
`file:`). That still includes pages like GitHub's `/blob/main/README.md` UI,
which is real HTML, not a raw file — the content script
(`src/content/detect.ts`) only takes over when the page is actually raw
text (`document.contentType` is `text/plain`/`text/markdown`, or the whole
`<body>` is Chrome's own single generated `<pre>` wrapper).

**Local `file://` links need one extra, manual step**: go to
`chrome://extensions` → this extension's **Details** → enable **Allow
access to file URLs**. Without it the content script is never injected into
`file://` pages at all.

Once confirmed raw, the extension mounts `AmaranthaEditor` inside a Shadow
DOM (`src/content/main.tsx`), isolating Amarantha's styling from the host
page and vice versa. Every CSS file it needs — `@amarantha/theme`'s,
`@mdxeditor/editor`'s, and `@amarantha/editor`'s own per-component
stylesheets — is collected and inlined into that shadow root by hand, since
a content script has no HTML page for Vite to auto-link generated CSS into.

## Try it (load unpacked)

1. `npm run build --workspace @amarantha/extension` from the repo root.
   Output lands in `packages/extension/dist/`.
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, click
   **Load unpacked**, and select `packages/extension/dist`.
3. Visit any raw `.md` URL (e.g. a `raw.githubusercontent.com/.../README.md`
   link) — it should render immediately.
4. Click the toolbar icon to open settings (`options.html`), or right-click
   it → **Options**.

Re-run the build and click the refresh icon on the extension's card in
`chrome://extensions` after any source change — Chrome doesn't hot-reload
unpacked extensions.

## Editing and saving

- **Edit** toggles the page between locked (read-only) and editable — the
  same Rich/Source toggle either way, since both modes forward `readOnly`
  down to `@amarantha/editor`.
- **Save** downloads the current buffer under its original filename via a
  `Blob` + object URL + synthetic `<a download>` click
  (`src/content/download.ts`) — not `chrome.downloads` or the File System
  Access API. It's disabled until the buffer actually differs from what was
  last saved.
- A dirty buffer guards a same-tab `beforeunload` and intercepts Cmd/Ctrl+S
  so it triggers this Save instead of Chrome's own "Save Page As".
