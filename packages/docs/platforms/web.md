# Web Demo

`@amarantha/web` is a plain-browser build of the editor with no
Tauri/VS Code/Chrome host chrome around it — just `AmaranthaEditor` plus a
toolbar. It doubles as the public live demo deployed to
[amarantha.app](https://amarantha.app). It is **not** a marketing site.

## Running locally

```sh
npm run dev:web
```

Serves at `localhost:4300`.

## Deployment

`amarantha.app` is a Netlify site (`netlify.toml` at the repo root). The
build runs from the **repo root**, not `packages/web`, because
`@amarantha/web` depends on the sibling workspace packages
(`core`/`editor`/`mdx`/`source`/`theme`) via npm workspace symlinks and Vite
path aliases pointing straight at their `src/` — those packages have no
build/publish step of their own, so installing from `packages/web` alone
would leave the workspace links unresolved.

```
command = "npm ci && npm run build --workspace @amarantha/web"
publish = "packages/web/dist"
```

DNS is delegated to Netlify (NS1); Netlify handles HTTPS automatically.

## What's not here yet

The demo's header has disabled "coming soon" callouts for desktop, VS Code,
and Chrome — those distribution channels don't exist yet
(`packages/web/src/App.tsx`).
