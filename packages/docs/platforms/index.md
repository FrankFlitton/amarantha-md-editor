# Platform-Specific Features

Amarantha's editing engine ([Amarantha Core](/core/)) is the same
everywhere. What differs by platform is how a document gets in and out of
that engine, and what host-native affordances (undo/redo, IntelliSense, a
menu bar) get wired up around it.

- **[Web Demo](/platforms/web)** — the browser-only build with no host
  chrome, live at [amarantha.app](https://amarantha.app).
- **[Desktop App](/platforms/desktop)** — the Tauri + React app where the
  filesystem is the source of truth.
- **[VS Code Extension](/platforms/vscode)** — a `CustomTextEditorProvider`
  for `.md`/`.mdx`, integrated with VS Code's own undo/redo and dirty state.
- **[Chrome Extension](/platforms/chrome-extension)** — a read-only MV3
  extension that renders raw `.md` URLs across the web.
