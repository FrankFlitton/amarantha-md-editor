# Amarantha Core

This section covers the editing engine and concepts that behave identically
no matter which platform you're using Amarantha in — desktop, VS Code, the
Chrome extension, or the web demo. All of this lives in the
host-agnostic packages (`@amarantha/core`, `@amarantha/editor`,
`@amarantha/source`, `@amarantha/mdx`, `@amarantha/theme`) and is exercised
identically by every host through the [`EditorHost`](/architecture#the-host-contract)
contract.

- **[Source-Preserving Editing](/core/source-preserving)** — how edits
  round-trip back to Markdown without rewriting formatting you didn't touch.
- **[Configuration](/core/configuration)** — `amarantha.config.json`, and how
  it's discovered across a repo.
- **[Config Schema Reference](/core/config-schema)** — the full field-by-field
  JSON Schema for `amarantha.config.json`.
- **[Custom Components](/core/custom-components)** — declaring JSX/MDX
  components so they render inline in the rich view.
- **[Frontmatter](/core/frontmatter)** — source-preserving YAML frontmatter
  editing, and declaring known fields.
- **[Themes & Fonts](/core/themes-and-fonts)** — the shared palette and font
  system every host draws from.
