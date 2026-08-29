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
| `packages/core` | Document model, config discovery, no UI. |
| `packages/editor` | `AmaranthaEditor` — the shared rich/source editor component. Built on MDXEditor/Lexical, with a custom source-preserving reconciliation layer. |
| `packages/source` | Source-view (CodeMirror) plumbing — highlighting, JSX-in-Markdown nesting. |
| `packages/mdx` | Component registries for custom JSX (e.g. `<Mermaid>`) rendered inline in the rich view. |
| `packages/theme` | Shared theme tokens/CSS, font loading. |
| `packages/desktop` | Tauri + React desktop app. The filesystem is the source of truth; not yet released/distributed. |
| `packages/vscode` | VS Code `CustomTextEditorProvider` for `.md`/`.mdx`. Not yet published to the Marketplace (`private: true`). |
| `packages/extension` | MV3 Chrome extension — renders raw `.md` URLs (GitHub raw links, gists, etc.) with Amarantha's rich view. Read-only. Not yet published to the Chrome Web Store. |
| `packages/web` | Plain-browser build of the editor with no Tauri/VS Code/Chrome host chrome, plus the marketing site around it (Product, Ecosystem, Contact). Deployed to **amarantha.app** (see Deployment below). |

`core`/`editor`/`source`/`mdx`/`theme` have no build step — consuming packages
alias straight to their `src/` via Vite `resolve.alias` +
`optimizeDeps.exclude`. Don't add a build step to these without checking
every consumer's Vite config.

### `packages/web` site structure

The home route (`/`) is still the interactive editor demo
(`src/pages/HomePage.tsx`). The other routes (`/product`, `/ecosystem`,
`/contact`) are marketing pages authored as `.mdx` files under
`src/content/`, imported with Vite's `?raw` suffix and rendered through
`AmaranthaEditor` in read-only rich mode (`src/site/ContentPage.tsx`) — the
site dogfoods the same editor component it's selling, rather than running
a separate static-site pipeline. Routing is a ~40-line `pushState` wrapper
in `src/site/router.tsx`, not a library: four flat routes don't need one,
and `netlify.toml`'s existing `/* -> /index.html` redirect (plus Vite's
default dev-server SPA fallback) already makes direct loads of those paths
work. Site-wide chrome (nav, theme picker) lives in `src/site/`.

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
