# Architecture

Amarantha is an npm-workspaces monorepo (`packages/*`). One core editing
component is reused across every host, with host-specific packages
providing only the glue each platform needs.

## Package layout

| Package | What it is |
|---|---|
| `@amarantha/core` | Document model, config discovery, no UI. Host-agnostic. |
| `@amarantha/editor` | `AmaranthaEditor` — the shared rich/source editor component, built on MDXEditor/Lexical with a custom source-preserving reconciliation layer. |
| `@amarantha/source` | Source-view (CodeMirror) plumbing — highlighting, JSX-in-Markdown nesting. |
| `@amarantha/mdx` | Component registries for custom JSX (e.g. `<Mermaid>`) rendered inline in the rich view. |
| `@amarantha/theme` | Shared theme tokens/CSS, font loading. |
| `@amarantha/desktop` | Tauri + React desktop app. The filesystem is the source of truth. |
| `@amarantha/vscode` | VS Code `CustomTextEditorProvider` for `.md`/`.mdx`. |
| `@amarantha/extension` | MV3 Chrome extension — renders raw `.md` URLs with Amarantha's rich view. Read-only. |
| `@amarantha/web` | Plain-browser build of the editor with no host chrome — the live demo at [amarantha.app](https://amarantha.app). |

`core`, `editor`, `source`, `mdx`, and `theme` have no build step —
consuming packages alias straight to their `src/` via Vite's
`resolve.alias` + `optimizeDeps.exclude`.

## The host contract

Every platform implements `EditorHost` (from `@amarantha/core`) to give the
shared editor engine file access:

```ts
interface EditorHost {
  readonly kind: "desktop" | "vscode" | string;
  readDocument(uri: DocumentUri): Promise<LoadedDocument>;
  writeDocument(request: WriteRequest): Promise<WriteResult>;
  watchDocument(uri: DocumentUri, onChange: (event: ExternalChange) => void): Disposable;
  getWorkspaceTrust(): Promise<WorkspaceTrust>;
  resolveWorkspaceConfig(uri: DocumentUri): Promise<WorkspaceHostConfig>;
}
```

Only `readDocument`/`writeDocument` are expected to be functionally real in
early hosts; the rest are implemented against the same shape as each host
matures. `desktopHost.ts` and the VS Code extension's host glue are the two
reference implementations.

This is the seam that makes "one editor, several homes" work: `@amarantha/editor`
never talks to Tauri, `vscode`, or the DOM `fetch`/download APIs directly —
it only talks to whatever `EditorHost` its container hands it.
