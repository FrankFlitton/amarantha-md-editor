# What is Amarantha?

Amarantha is a rich, source-preserving Markdown/MDX editor. You edit as rich
text — headings, bold, lists, links, custom JSX components — and the file on
disk stays exactly as you wrote it. Nothing gets silently reformatted on
save.

"Source-preserving" is the load-bearing design goal: edits round-trip back
to Markdown without rewriting formatting you didn't touch, such as list
marker style, quote style, or line wrapping.

## Where to get it

| Surface | Status |
|---|---|
| Web demo | Live at [amarantha.app](https://amarantha.app) |
| Desktop app (macOS / Windows) | In progress |
| VS Code extension | Not yet published |
| Chrome extension | Not yet published |

## How the docs are organized

- **[Amarantha Core](/core/)** covers the editing engine and concepts that
  are the same everywhere Amarantha runs: source-preserving reconciliation,
  repo configuration, custom components, frontmatter, and themes/fonts.
- **[Platform-Specific Features](/platforms/)** covers what's different
  about each host — the web demo, the desktop app, the VS Code extension,
  and the Chrome extension.

See [Architecture](/architecture) for how the pieces fit together.
