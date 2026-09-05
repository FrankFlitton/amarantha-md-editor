# @amarantha/vscode

A VS Code `CustomTextEditorProvider` for `.md`/`.mdx` files, wrapping `AmaranthaEditor` in a webview. The open `vscode.TextDocument` is the sole source of truth — edits are applied as `WorkspaceEdit`s (reconciled against the live document via `@amarantha/core`'s `reconcileMarkdown`), so native undo/redo, the dirty indicator, and Ctrl/Cmd+S all come from VS Code itself. See `docs/decisions.md` and `/Users/franklinflitton/.claude/plans/concurrent-wiggling-owl.md` for the full design rationale.

## Try it

1. Open the **repo root** (`amarantha-md-editor`) as your VS Code workspace — the F5 launch config lives at the repo root, pointing at this package.
2. Press **F5** ("Run Amarantha Extension"). This builds the extension (`npm run build:vscode`) and opens an Extension Development Host window.
3. In that window, open a `.md` file, right-click its tab (or the editor title) → **Reopen Editor With…** → **Amarantha**.

Amarantha is registered with `priority: "option"`, not `"default"` — it won't replace VS Code's built-in text editor for markdown files unless you explicitly reopen with it.

## What's wired up

- Rich/Source toggle, per-repo `amarantha.config.json` discovery (component registry + frontmatter fields), pasted/dropped image handling (saved to an `assets/` folder next to the document), and font preferences (bundled Geist, curated Fontsource picks, or a custom Fontsource ID / system font).
- JSON Schema-backed IntelliSense (autocomplete, hover docs, validation) when editing `amarantha.config.json` itself, via the `jsonValidation` contribution point in `package.json` pointing at `schemas/amarantha.config.schema.json`. Keep that schema in sync by hand with `AmaranthaConfig` (`packages/core/src/config.ts`) and `ComponentDefinition`/`FrontmatterFieldDefinition` (`packages/core/src/types.ts`) when those shapes change.
- Colors follow VS Code's own active color theme (`src/webview/vscode-theme-adapter.css`) rather than Amarantha's own 10-theme picker — the more idiomatic choice for a VS Code extension.

## Not built here

- A Diff mode (flagged in the plan as cross-host future work for `@amarantha/editor`) — VS Code's own git/diff commands still open its built-in plain-text diff view for `.md` files, unaffected by this extension.
- `.vsix` packaging (`npm run package`) is wired but not yet dry-run — do that once the F5 flow above has been manually verified.
