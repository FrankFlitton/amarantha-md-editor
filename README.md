# Amarantha

A rich, source-preserving Markdown/MDX editor. Edit as rich text — headings,
bold, lists, links, custom JSX components — and the file on disk stays
exactly as you wrote it. No silent reformatting on save.

**[Try the live demo →](https://amarantha.app)**

## Where to get it

| Surface | Status |
|---|---|
| 🌐 Web demo | Live at [amarantha.app](https://amarantha.app) |
| 🖥️ Desktop app (macOS / Windows) | In progress — [releases](https://github.com/FrankFlitton/amarantha-md-editor/releases) |
| 🧩 VS Code extension | Not yet published |
| 🌎 Chrome extension | Not yet published |

## What makes it different

- **Source-preserving.** Formatting you didn't touch — list marker style,
  quote style, line wrapping — isn't rewritten out from under you.
- **Custom components, inline.** MDX components like diagrams or embeds
  render right alongside your prose, driven by a simple JSON config
  (`amarantha.config.json`) rather than hardcoded support.
- **One editor, several homes.** The same core editing engine runs in a
  desktop app, VS Code, a Chrome extension, and the browser demo above.

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

Issues and PRs welcome — this project is early and moving fast, so it's
worth opening an issue before a large change.
