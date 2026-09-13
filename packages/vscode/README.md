# Amarantha for VS Code

A rich editor for Markdown/MDX repositories that actually understands the
custom components you've already built — not just headings and lists.
Declare your `<Mermaid>`, `<YouTube>`, or `<UserJourney>` blocks once in a
workspace `amarantha.config.json`, and get real property editors for them
instead of hand-edited JSX attributes. The file on disk stays exactly as
you wrote it.

**[Try the live web demo →](https://amarantha.app)**

## Usage

Amarantha registers as an *optional* editor for `.md`/`.mdx` files — it
won't replace VS Code's built-in text editor automatically.

1. Open a `.md` or `.mdx` file.
2. Right-click the editor tab (or the editor title bar) → **Reopen Editor
   With…** → **Amarantha**.
3. Use the toolbar in the editor title bar to toggle between rich text and
   source, show/hide frontmatter, and change typography.

## Features

- **Real editors for your own components, not just text.** Declare a
  component's props once in `amarantha.config.json` at your workspace
  root — string, number, boolean, enum, or raw expression — and Amarantha
  renders a proper field for each one (checkboxes, dropdowns, number
  inputs) right where the component sits in your prose. Editing that
  config file itself gets autocomplete, hover docs, and validation for
  free.
- **Untouched stays untouched.** Any component you haven't described — or
  don't want to — round-trips exactly as written. Amarantha never
  flattens unknown JSX to generic HTML or drops what it doesn't
  recognize.
- **Source-preserving by default.** Formatting you didn't touch — list
  marker style, quote style, line wrapping — isn't rewritten out from
  under you on save.
- **Native VS Code integration.** Undo/redo, the dirty indicator, and
  Ctrl/Cmd+S all come from VS Code itself — the open document is always
  the source of truth.
- **Image paste/drop.** Pasted or dropped images are saved to an `assets/`
  folder next to the document and linked automatically.
- **Typography.** Pick from bundled fonts (Geist, Inter, IBM Plex, and
  more) or your own Fontsource ID / system font.
- **Theme-aware.** Colors follow VS Code's own active color theme rather
  than a separate picker.

## Known limitations

- No dedicated diff view yet — VS Code's built-in plain-text diff still
  opens for `.md`/`.mdx` files via git.

## Development

This extension lives in a monorepo alongside Amarantha's other hosts
(desktop, web, Chrome). See the
[repository](https://github.com/FrankFlitton/amarantha-md-editor) for the
full source and [`docs/decisions.md`](https://github.com/FrankFlitton/amarantha-md-editor/blob/main/docs/decisions.md)
for design rationale.

To run from source:

1. Open the **repo root** (`amarantha-md-editor`) as your VS Code
   workspace — the F5 launch config lives there, pointing at this package.
2. Press **F5** ("Run Amarantha Extension"). This builds the extension
   (`npm run build:vscode`) and opens an Extension Development Host
   window.
3. In that window, follow the **Usage** steps above.

Issues and PRs welcome — this project is early and moving fast, so it's
worth opening an issue before a large change.
