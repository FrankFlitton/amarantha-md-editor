# AGENTS.md — @amarantha/core

Instructions for AI coding agents working in this package.

## What this is

Host-agnostic document model and config logic for Amarantha, with no UI and
no dependency on any specific host (desktop/VS Code/Chrome/web). It's not
built — every consumer (`@amarantha/editor`, `packages/desktop`,
`packages/vscode`, ...) imports straight from `src/` via each consumer's Vite
alias, so there's no dist to keep in sync and no compile step to run before
other packages pick up a change. See the root [`AGENTS.md`](../../AGENTS.md)
for the full monorepo layout.

## Modules

| File | What it's for |
|---|---|
| `document.ts` | `LoadedDocument` construction — line-ending detection, frontmatter-block sniffing, the placeholder revision hash used as `WriteRequest.baseRevision`. |
| `reconcile.ts` | `reconcileMarkdown` — the source-preservation core. Diffs old/new mdast trees and only reserializes nodes that actually changed, so untouched formatting (list markers, quote style, line wrapping) survives byte-for-byte. |
| `config.ts` | `AmaranthaConfig` — the shape of a repo's `amarantha.config.json` (JSON-only, no executable config) — plus `FsAdapter`, the minimal filesystem contract `discoverConfig.ts` needs. |
| `discoverConfig.ts` | `discoverWorkspaceConfig` — walks upward from a document looking for `amarantha.config.json` at every ancestor (ESLint-style `root: true` stop), folding configs root-most-first so the closest one wins. |
| `registryMerge.ts` | `mergeComponentDefinitions` / `mergeFrontmatterFields` — same-name-key override merge used by `discoverConfig.ts` to fold ancestor configs together. |
| `frontmatter.ts` | Source-preserving YAML frontmatter read/mutate helpers, built on `yaml`'s `Document` API (not `js-yaml`'s lossy load/dump) — editing one key never disturbs another key's order, comments, or quoting. |
| `media.ts` | Pure, host-agnostic image-src helpers (`isRemoteOrDataUrl`, `sanitizeAssetFileName`, `arrayBufferToBase64`). Hosts own the actual file I/O. |
| `theme.ts` | `ThemeFamily`/`ThemeMode`/`ThemeId`/`ProseSize` type definitions — no logic. |
| `fonts.ts` | `FontPreference` shape (bundled/Fontsource/system) and `DEFAULT_FONT_PREFERENCE`. |
| `types.ts` | Everything else: `EditorHost` (the contract a host implements for file access), `ComponentDefinition`/`ComponentRegistry` (JSX component registry), `FrontmatterFieldDefinition`, `WorkspaceHostConfig`. |

`index.ts` is the only import surface consumers should use —
`@amarantha/core` re-exports from there, not from individual files.

## Usage

Everything is a plain function or type import — no class instances to
construct, no setup/init call.

```ts
import {
  reconcileMarkdown,
  discoverWorkspaceConfig,
  toLoadedDocument,
  readFrontmatterEntries,
  type FsAdapter,
  type EditorHost,
} from "@amarantha/core";

// Loading a document, e.g. inside an EditorHost.readDocument implementation:
const doc = toLoadedDocument(uri, fileText);

// Reconciling an editor's serialized output back against the original source
// (the source-preservation step — call this before writing to disk):
const preserved = reconcileMarkdown(originalText, editorSerializedText);

// Discovering a repo's amarantha.config.json chain — needs an FsAdapter,
// which each host implements against its own filesystem API
// (see packages/desktop/src/lib/tauriFsAdapter.ts, packages/vscode/src/vscodeFsAdapter.ts):
const workspaceConfig = await discoverWorkspaceConfig(docUri, fsAdapter);

// Reading frontmatter for display, without touching unrelated keys:
const entries = readFrontmatterEntries(yamlBlockText);
```

To wire a new host up to `@amarantha/editor`, implement `EditorHost` (from
`types.ts`) against that host's real file/watch APIs — `desktopHost.ts` and
the VS Code extension's host glue are the two reference implementations.

## Conventions

- No build step — don't add one without checking every consumer's Vite
  `resolve.alias`/`optimizeDeps.exclude` config (see root `AGENTS.md`).
- Stays UI-free and host-free. If a helper needs a DOM, a specific host's
  API, or React, it belongs in `@amarantha/editor` or the host package, not
  here.
- Frontmatter and reconciliation helpers are source-preserving by design —
  never introduce a change here that reformats content the caller didn't
  explicitly ask to change (see `frontmatter.ts` and `reconcile.ts` doc
  comments for the specific guarantees each makes).
- `AmaranthaConfig` is JSON-only, never executable — don't add a `.ts`/JS
  config-loading path without checking the RFC's workspace-trust stance
  (`docs/project kickoff/initial claude code handoff.md`).
- If you change `AmaranthaConfig` (this file) or `ComponentDefinition`/
  `FrontmatterFieldDefinition` (`types.ts`), update
  `packages/vscode/schemas/amarantha.config.schema.json` to match — it's
  maintained by hand, not generated.

## Commands

Run from the repo root, or with `--workspace @amarantha/core`:

- `npm test --workspace @amarantha/core` — Vitest.
- `npm run typecheck --workspace @amarantha/core` — `tsc --noEmit`.
