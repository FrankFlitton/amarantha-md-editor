# VS Code Extension

`@amarantha/vscode` is a `CustomTextEditorProvider` for `.md`/`.mdx` files,
wrapping `AmaranthaEditor` in a webview.

::: warning Not yet published
Not yet published to the VS Code Marketplace (`private: true` in its
`package.json`).
:::

## The open document is the source of truth

Unlike the desktop app's direct filesystem access, edits here are applied as
`WorkspaceEdit`s, reconciled against the live `vscode.TextDocument` via
`@amarantha/core`'s `reconcileMarkdown` (see
[Source-Preserving Editing](/core/source-preserving)). That means native
undo/redo, the dirty indicator, and Ctrl/Cmd+S all come from VS Code itself
— Amarantha never owns save state here.

## Try it

1. Open the **repo root** (`amarantha-md-editor`) as your VS Code workspace
   — the F5 launch config lives at the repo root, pointing at this package.
2. Press **F5** ("Run Amarantha Extension"). This builds the extension
   (`npm run build:vscode`) and opens an Extension Development Host window.
3. In that window, open a `.md` file, right-click its tab (or the editor
   title) → **Reopen Editor With…** → **Amarantha**.

Amarantha is registered with `priority: "option"`, not `"default"` — it
won't replace VS Code's built-in text editor for Markdown files unless you
explicitly reopen with it.

## What's wired up

- Rich/Source toggle, per-repo `amarantha.config.json` discovery (component
  registry + frontmatter fields, see [Configuration](/core/configuration)),
  pasted/dropped image handling (saved to an `assets/` folder next to the
  document), and font preferences (bundled Geist, curated Fontsource picks,
  or a custom Fontsource ID / system font — see
  [Themes & Fonts](/core/themes-and-fonts)).
- JSON Schema-backed IntelliSense (autocomplete, hover docs, validation) for
  `amarantha.config.json` itself, via the `jsonValidation` contribution
  point pointing at `schemas/amarantha.config.schema.json`. This schema is
  maintained **by hand** — it must be kept in sync with `AmaranthaConfig`
  (`packages/core/src/config.ts`) and
  `ComponentDefinition`/`FrontmatterFieldDefinition`
  (`packages/core/src/types.ts`) whenever those shapes change.
- Colors follow VS Code's own active color theme
  (`src/webview/vscode-theme-adapter.css`) rather than Amarantha's own
  10-theme picker — the more idiomatic choice inside VS Code.

## Not built here

- A Diff mode — VS Code's own git/diff commands still open its built-in
  plain-text diff view for `.md` files, unaffected by this extension.
- `.vsix` packaging (`npm run package`) is wired but not yet dry-run.
