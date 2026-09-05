# AGENTS.md

Instructions for AI coding agents working in this repo.

## What this is

Amarantha is a rich, source-preserving Markdown/MDX editor — one core editing
component (`@amarantha/editor`) reused across a desktop app, a VS Code
extension, a Chrome extension, and a browser demo. "Source-preserving" is the
load-bearing design goal: edits round-trip back to Markdown without silently
rewriting formatting the user didn't touch (list marker style, quote style,
line wrapping, etc). See `docs/decisions.md` for the full history of
architecture calls and the empirical results that drove them, and
`docs/project kickoff/initial claude code handoff.md` for the original RFC.

## Monorepo layout

npm workspaces, `packages/*`. No lerna/turborepo — plain npm scripts.

| Package | What it is |
|---|---|
| `packages/core` | Document model, config discovery, no UI. See [`packages/core/AGENTS.md`](./packages/core/AGENTS.md). |
| `packages/editor` | `AmaranthaEditor` — the shared rich/source editor component. Built on MDXEditor/Lexical, with a custom source-preserving reconciliation layer. |
| `packages/source` | Source-view (CodeMirror) plumbing — highlighting, JSX-in-Markdown nesting. |
| `packages/mdx` | Component registries for custom JSX (e.g. `<Mermaid>`) rendered inline in the rich view. |
| `packages/theme` | Shared theme tokens/CSS, font loading. |
| `packages/desktop` | Tauri + React desktop app. The filesystem is the source of truth; not yet released/distributed. |
| `packages/vscode` | VS Code `CustomTextEditorProvider` for `.md`/`.mdx`. Not yet published to the Marketplace (`private: true`). Ships a JSON Schema (`schemas/amarantha.config.schema.json`) for `amarantha.config.json` IntelliSense — keep it hand-in-sync with `packages/core/src/config.ts` and `types.ts`. |
| `packages/extension` | MV3 Chrome extension — renders raw `.md` URLs (GitHub raw links, gists, etc.) with Amarantha's rich view. Read-only. Not yet published to the Chrome Web Store. |
| `packages/web` | Plain-browser build of the editor with no Tauri/VS Code/Chrome host chrome. Doubles as the live demo deployed to **amarantha.app** (see Deployment below) — it is *not* a marketing site, just the editor plus a toolbar. |

`core`/`editor`/`source`/`mdx`/`theme` have no build step — consuming packages
alias straight to their `src/` via Vite `resolve.alias` +
`optimizeDeps.exclude`. Don't add a build step to these without checking
every consumer's Vite config.

## Commands

Run from the repo root:

- `npm run dev` — desktop app (Tauri dev).
- `npm run dev:web` — browser demo at `localhost:4300`.
- `npm run build` — desktop app build.
- `npm run build:vscode` / `npm run build:extension` — package those targets.
- `npm test` — all workspace tests (Vitest).
- `npm run typecheck` — all workspace typechecks.

Per-package `npm test`/`typecheck` work too via `--workspace @amarantha/<name>`.

## Conventions

- Tests select DOM elements via `data-testid`, not text/role queries.
- No comments explaining *what* code does — only non-obvious *why* (a
  workaround, an invariant, a subtlety that would surprise a reader).
- Before adding UI-affecting changes to `packages/web` or any host package,
  verify visually (dev server + browser), don't rely on typecheck/tests alone
  for feature correctness.

## Deployment

`amarantha.app` is a Netlify site (`netlify.toml` at repo root) building
`packages/web` — `npm ci && npm run build --workspace @amarantha/web`,
publishing `packages/web/dist`. DNS is delegated to Netlify (NS1); Netlify
handles HTTPS automatically. Desktop/VS Code/Chrome distribution channels
don't exist yet — the demo's header has disabled "coming soon" callouts for
them (`packages/web/src/App.tsx`).
