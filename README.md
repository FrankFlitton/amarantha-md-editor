<p align="center">
  <img width="120" alt="Amarantha" src="./design/logos/App%20Icon.svg" />
</p>

# Amarantha

A rich editor for Markdown/MDX repositories that actually understands the custom components you've already built — not just headings and lists. Point it at a repo, declare your `<Mermaid>`, `<YouTube>`, or `<UserJourney>` blocks once, and get real property editors for them instead of hand-edited JSX attributes. The file on disk stays exactly as you wrote it.

[Try the live demo →](https://amarantha.app)

## Where to get it

| Surface                           | Status                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 🌐 Web demo                       | Live at [Amarantha.app](https://amarantha.app)                                                                 |
| 🖥️ Desktop app (macOS / Windows) | [GitHub Releases](https://github.com/FrankFlitton/amarantha-md-editor/releases)                                |
| 🧩 VS Code extension              | VS Code [Marketplace](https://marketplace.visualstudio.com/items?itemName=Amarantha.amarantha-markdown-editor) |
| 🌎 Chrome extension               | In Progress                                                                                                    |

## What makes it different

* **Real editors for your own components, not just text.** Declare a component's props once in a per-repo `amarantha.config.json` — string, number, boolean, enum, or raw expression — and Amarantha renders a proper field for each one (checkboxes, dropdowns, number inputs) right where the component sits in your prose. No hardcoded support for specific components, and nothing to build per-project: the registry is just JSON.
* **Untouched stays untouched.** Any component you haven't described — or don't want to — round-trips exactly as written. Amarantha never flattens unknown JSX to generic HTML or drops what it doesn't recognize.
* **Source-preserving by default.** Formatting you didn't touch — list marker style, quote style, line wrapping — isn't rewritten out from under you on save. Markdown editing that doesn't fight your diffs.
* **One editor, everywhere your content lives.** The same core editing engine runs in a desktop app, a VS Code extension, a Chrome extension, and the browser demo above — the way you write doesn't depend on where you happen to be.
* **Repo-aware theming and frontmatter, from the same config.** Ten built-in palettes (light + dark, independent of your OS setting), any typeface on Fontsource, and a structured form for whatever frontmatter fields your repo defines — instead of raw YAML.

## Developing locally

This is an npm-workspaces monorepo (`packages/*`) — no separate build
tooling required.

```sh
npm install
npm run dev:web       # browser demo at localhost:4300
npm run dev           # desktop app (Tauri)
```

See [`AGENTS.md`](./AGENTS.md) for the package layout, commands, and
architecture notes.

## Contributing

Issues and PRs welcome. This project is early and moving fast, so it's
worth opening an issue before a large change.