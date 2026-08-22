# Native theming engine + per-repo `amarantha.config.json`

## Context

Amarantha currently has zero theming infrastructure: `packages/desktop/src/App.css` and `packages/editor/src/jsx/jsx-editor.css` each hardcode hex colors independently, with duplicated `@media (prefers-color-scheme: dark)` blocks. The only per-repo customization hook that exists (`EditorHost.resolveComponentRegistry`) is hardcoded to always return one QA-target registry (`personalWebsiteRegistry`), explicitly flagged in code comments as "temporary... until real per-repo `.amarantha/config` discovery is built."

Goal: make theming a first-class, Markdown-content-native concept — a small set of named light/dark theme pairs, defaulting to OS preference, selectable per-repo via a discoverable `amarantha.config.json`, with the same config also carrying the (already-designed) component registry. The config format must work for both monorepos (nested configs, closer-to-file wins) and microrepos (one root config, no shared parent). Also fold in `@tailwindcss/typography` for the editor's prose content, wired through the same token system rather than as a separate theming mechanism, with room to add other base stylesheets/design systems later.

Decisions already made with the user: JSON-only config for v0 (no `.ts` execution — matches the existing RFC security stance of never auto-executing repo code without a trust gate); a manually-picked theme is a **global** override, not per-document; theme families ship as **full light+dark pairs**; theme tokens/CSS live in a **new `@amarantha/theme` package**; light/dark **mode** is a separate axis from palette **family**, with a dedicated Light/Dark/System dropdown, and defaults to following the OS unless the user overrides it.

---

## 1. Theme catalog (10 themes, 5 families)

New tokens (7 per theme): `--am-bg`, `--am-surface`, `--am-border`, `--am-text`, `--am-text-muted`, `--am-accent`, `--am-accent-text`. Starting values below — tune visually during implementation, not final:

| Theme | bg | surface | border | text | text-muted | accent | accent-text |
|---|---|---|---|---|---|---|---|
| `ember-light` (current identity) | `#fbfbfa` | `#f3f2ef` | `#e5e5e3` | `#0f0f0f` | `#6b6b68` | `#d97757` | `#fbfbfa` |
| `ember-dark` (current identity) | `#1e1e1c` | `#232321` | `#3a3a37` | `#f0f0f0` | `#a3a39e` | `#d97757` | `#1e1e1c` |
| `minimal-light` | `#ffffff` | `#f7f7f7` | `#e3e3e3` | `#171717` | `#767676` | `#3f3f46` | `#ffffff` |
| `minimal-dark` | `#121212` | `#1a1a1a` | `#2e2e2e` | `#e8e8e8` | `#9a9a9a` | `#a1a1aa` | `#121212` |
| `solarized-light` | `#fdf6e3` | `#eee8d5` | `#93a1a1` | `#657b83` | `#93a1a1` | `#268bd2` | `#fdf6e3` |
| `solarized-dark` | `#002b36` | `#073642` | `#586e75` | `#839496` | `#586e75` | `#268bd2` | `#002b36` |
| `matrix-light` | `#f2f7f0` | `#e6efe2` | `#b8d2b6` | `#163318` | `#4a6b4a` | `#0a7a2f` | `#f2f7f0` |
| `matrix-dark` | `#050705` | `#0b120b` | `#1e2e1e` | `#c9f2cf` | `#7fae82` | `#00ff41` | `#050705` |
| `cream-light` | `#faf3e7` | `#f2e8d8` | `#e0d0b0` | `#3a2e1f` | `#8a7860` | `#a67c3d` | `#faf3e7` |
| `cream-dark` | `#2b2116` | `#3a2e1f` | `#5a4a34` | `#f0e3c8` | `#b8a582` | `#d9a441` | `#2b2116` |

Solarized uses the canonical Solarized hex values + blue accent. Ember reuses today's exact hex values (no visual regression for existing users). Matrix/cream light variants invert the family's dark identity rather than reusing a generic light palette, so each family still reads as itself in both modes.

## 2. `@amarantha/theme` package (new)

- `packages/theme/package.json` — `dependencies: { "@amarantha/core": "*" }`, no build step (matches core/mdx/editor convention).
- `packages/theme/src/tokens.css` — one `[data-theme="<id>"] { --am-*: ...; }` block per theme (10 blocks), plus a `:root:not([data-theme])` block with a `prefers-color-scheme` media query defaulting to `ember-light`/`ember-dark`.
- `packages/theme/src/mdxeditor-adapter.css` — **one static block**, not per-theme:
  ```css
  .amarantha-app .mdxeditor {
    --baseBg: var(--am-surface);
    --baseText: var(--am-text);
    --baseBorder: var(--am-border);
    --accentSolid: var(--am-accent);
    --accentText: var(--am-accent);
    /* remaining semantic aliases: --baseBgSubtle/Hover/Active,
       --accentBase/Bg/Border, --admonition*Bg/Border, etc. */
  }
  ```
  Confirmed against the real shipped `@mdxeditor/editor@4.2.1` stylesheet: `"mdxeditor"` is a stable unhashed class on the editor root, all of MDXEditor's own CSS reads only the semantic alias vars (never the raw Radix scale vars directly), and the semantic-alias rule is scoped to specificity 0,1,0. A rule targeting `.amarantha-app .mdxeditor` (0,2,0) reliably wins regardless of import order or MDXEditor's own `.dark`/`.light-theme` classes — no reliance on those classes needed. As cheap defensive insurance (not load-bearing), also apply a `dark`/`light-theme` class alongside `data-theme` on the app root, in case a future MDXEditor version introduces a raw-scale-var leak somewhere.
- `packages/theme/src/typography-adapter.css` — same pattern, one static block mapping Tailwind Typography's `--tw-prose-*` vars to `--am-*` (see §4) — no `prose-invert`/`dark:` needed since our own theme switch already drives color.
- `packages/theme/src/index.css` — `@import` of the three files above; the one stylesheet consumers import.
- `packages/theme/src/index.ts` — `export const THEMES: ThemeCatalogEntry[]` where `ThemeCatalogEntry = { id: ThemeId; family: ThemeFamily; mode: ThemeMode; label: string }`. `ThemeId`/`ThemeFamily`/`ThemeMode` are re-exported from `@amarantha/core` (kept there, alongside `ComponentDefinition`, so `core` stays the single source of truth for shared types).

## 3. App wiring for theme — family vs. mode as independent axes

Palette **family** (ember/minimal/solarized/matrix/cream — "which theme") and **mode** (light/dark — "which half of it") are kept as two independent preferences rather than one flat theme choice, so a repo's palette opinion never fights the user's light/dark/system choice:

- `packages/core/src/theme.ts` (new):
  ```ts
  export type ThemeFamily = "ember" | "minimal" | "solarized" | "matrix" | "cream";
  export type ThemeMode = "light" | "dark";
  export type ThemeId = `${ThemeFamily}-${ThemeMode}`; // "ember-light" | ... | "cream-dark"
  export type ThemeModePreference = ThemeMode | "system";
  ```
- **Mode selector** — a Light/Dark/System dropdown in the titlebar/nav (`packages/desktop/src/App.tsx`), backed by `modePreference: ThemeModePreference` state, default `"system"`, persisted to `localStorage`. When `"system"`, resolve live via `window.matchMedia("(prefers-color-scheme: dark)")` with a `change` listener (so toggling OS appearance updates the app without reload); when `"light"`/`"dark"`, pin it regardless of OS. This mirrors the standard OS-preference-vs-override pattern (system apps, browsers) rather than a binary toggle.
- **Family selector** — a separate palette picker (dropdown/swatches, exact visual TBD in implementation), backed by `familyPreference: ThemeFamily | undefined` state, default `undefined` ("no local override"), persisted to `localStorage`.
- **Effective family** = `familyPreference` (local override) ?? per-repo config `theme` field (§5 — now typed as `ThemeFamily`, not a full `ThemeId`, so it only ever opinions the palette, never pins light/dark) ?? `"ember"`.
- **Effective mode** = `modePreference === "system"` ? OS preference : `modePreference`.
- **Effective theme id** = `` `${effectiveFamily}-${effectiveMode}` ``, applied as `data-theme` on the app root `<div>` (which also gets `className="amarantha-app"`).
- `packages/desktop/src/App.css` and `packages/editor/src/jsx/jsx-editor.css` — replace every hardcoded hex with the matching `var(--am-*)`; delete both files' own `@media (prefers-color-scheme: dark)` blocks (superseded by `@amarantha/theme`'s single fallback block).
- `packages/desktop/vite.config.ts` — add `"@amarantha/theme": path.resolve(__dirname, "../theme/src/index.ts")` to `resolve.alias` and `optimizeDeps.exclude`, matching the existing entries for core/mdx/editor.
- `AmaranthaEditor.tsx` needs no change for the MDXEditor-adapter mechanism itself (ancestor-selector based, not prop-based).

## 4. Tailwind Typography integration

Scoped addition, confined to where prose content actually renders — not a full app-wide Tailwind migration.

- Add `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography` as devDependencies of `packages/desktop` (the only package with a Vite build; `packages/editor`/`core`/`mdx` stay build-tool-agnostic, consistent with their no-build-step convention).
- `packages/desktop/src/tailwind.css` (new) — `@import "tailwindcss"; @plugin "@tailwindcss/typography";`, imported once from `main.tsx`. Since `packages/editor` is a sibling workspace package consumed via Vite alias (not `node_modules`), verify Tailwind v4's automatic content detection picks up `prose` class usage there (it scans the git repo by default); if not, add an explicit `@source "../../editor/src"` directive as a safety net.
- `packages/editor/src/AmaranthaEditor.tsx` — add a `proseClassName?: string` prop, default `"amarantha-prose prose"`, passed to `contentEditableClassName`. This is the hook for later swapping in a different base stylesheet or design system (e.g. MUI) without touching the component internals — directly serves the "explore other design systems later" ask, at near-zero cost now.
- **Font size control**, via Tailwind Typography's own size-modifier classes (`prose-sm`/`prose-base`/`prose-lg`/`prose-xl`/`prose-2xl`, each rescaling the whole type ramp, not just a font-size override) rather than custom CSS:
  - `packages/core/src/theme.ts` — also export `type ProseSize = "sm" | "base" | "lg" | "xl" | "2xl";`.
  - `packages/editor/src/AmaranthaEditor.tsx` — add a `proseSize?: ProseSize` prop, default `"base"`. Resolve it through a **static literal lookup** (`const PROSE_SIZE_CLASS: Record<ProseSize, string> = { sm: "prose-sm", base: "prose-base", lg: "prose-lg", xl: "prose-xl", "2xl": "prose-2xl" }`), not a template literal — Tailwind v4's content scanner finds literal class-name strings in source, and a dynamically-built `` `prose-${size}` `` string would not be detected, silently dropping the generated CSS for whichever sizes aren't otherwise referenced. Final `contentEditableClassName` = `` `${proseClassName} ${PROSE_SIZE_CLASS[proseSize]}` ``.
  - `packages/desktop/src/App.tsx` — third titlebar/nav control: a size dropdown (Small/Normal/Large/XL/2XL), backed by `sizePreference: ProseSize` state, default `"base"`, persisted to `localStorage` alongside `modePreference`/`familyPreference`, passed down as `proseSize` to `AmaranthaEditor`. Independent of both theme axes — purely a readability preference.
- `packages/theme/src/typography-adapter.css` — override block scoped to `.amarantha-prose.prose`, mapping `--tw-prose-body/headings/links/bold/counters/bullets/hr/quotes/quote-borders/captions/code/pre-code/pre-bg/th-borders/td-borders` to the matching `--am-*` token. This makes prose content follow all 10 themes automatically with no Tailwind-side dark-mode config.
- Drop `App.css`'s hardcoded `.amarantha-prose { max-width: 720px; ... }` box-model rules in favor of Tailwind Typography's own default measure, or keep `max-width` as a plain (non-color) override — implementation's call, not a theming concern.

## 5. `amarantha.config.json` discovery + merge (`@amarantha/core`)

New files, all in `@amarantha/core` (keeps `@amarantha/mdx` and `@amarantha/theme` dependency-free of this logic — core has no dependency on mdx today and this must not introduce one):

- `packages/core/src/config.ts`:
  ```ts
  export interface AmaranthaConfig {
    root?: boolean;               // stop upward discovery here (ESLint-style)
    theme?: ThemeFamily;          // palette opinion only — never pins light/dark mode
    components?: ComponentDefinition[];
  }
  export interface FsAdapter {
    exists(path: string): Promise<boolean>;
    readTextFile(path: string): Promise<string>;
    dirname(path: string): Promise<string>;
    join(...parts: string[]): Promise<string>;
  }
  export interface WorkspaceConfig {
    theme?: ThemeFamily;
    componentDefinitions: ComponentDefinition[];
  }
  ```
- `packages/core/src/registryMerge.ts` — `mergeComponentDefinitions(base, override): ComponentDefinition[]`, `Map` keyed by `name`, override replaces same-name base entries, otherwise appends. (No such merge primitive exists anywhere today — this is the one genuinely new algorithm.)
- `packages/core/src/discoverConfig.ts` — `discoverWorkspaceConfig(docUri: DocumentUri, fs: FsAdapter): Promise<WorkspaceConfig>`:
  1. `dir = dirname(docUri)`.
  2. Loop: if `amarantha.config.json` exists in `dir`, read + `JSON.parse`, record `{dir, config}`.
  3. Stop when the just-read config has `root: true`, OR `dirname(dir) === dir` (filesystem root), OR a hard cap (~50 iterations) is hit — bounds the walk so it can never silently traverse all the way to `$HOME` (Tauri's fs capability scope).
  4. Otherwise `dir = dirname(dir)`, repeat.
  5. Reverse the collected list (root-most first = lowest precedence, closest-to-file last = highest).
  6. Fold left to right: `theme` = last-defined value wins; `componentDefinitions` = `mergeComponentDefinitions(acc, cfg.components ?? [])`.
  7. No config found anywhere → `{ theme: undefined, componentDefinitions: [] }` (microrepo-with-no-config and "reached fs root" both degrade to this cleanly).
- Tests: `packages/core/src/discoverConfig.test.ts`, `registryMerge.test.ts`, using an in-memory fake `FsAdapter` (plain path→content map) — no Tauri dependency needed to test this.

## 6. Wiring into `EditorHost` / desktop

- `packages/core/src/types.ts` — replace `resolveComponentRegistry(uri)` with `resolveWorkspaceConfig(uri): Promise<{ theme?: ThemeFamily; componentRegistry: ComponentRegistry }>` on `EditorHost`. (One clean shape, chosen over adding a second parallel method: the desktop-side host already depends on `@amarantha/mdx`, so it does the `createRegistry(...)` call itself — the interface in `core` stays mdx-agnostic.)
- `packages/desktop/src/lib/tauriFsAdapter.ts` (new) — implements `FsAdapter` using `@tauri-apps/plugin-fs`'s `exists`/`readTextFile` and `@tauri-apps/api/path`'s `dirname`/`join` — the same imports `imageHost.ts` already uses; no new Tauri capability grant needed.
- `packages/desktop/src/lib/desktopHost.ts` — `resolveWorkspaceConfig(uri)` calls `discoverWorkspaceConfig(uri, tauriFsAdapter)`, then wraps the result with `createRegistry(componentDefinitions)` from `@amarantha/mdx`. Retire `personalWebsiteRegistry` as the hardcoded fallback (this feature is exactly what makes it obsolete) — keep `personalWebsiteComponents.ts`'s data as a test fixture / migrate it into an example `amarantha.config.json` used for manual QA against the real Personal-Website content repo, rather than deleting it outright.
- `packages/desktop/src/App.tsx` — swap the `resolveComponentRegistry` call site for `resolveWorkspaceConfig`; feed the returned `theme` (a `ThemeFamily`) into the effective-family resolution in §3 — it never affects `modePreference`.
- `docs/decisions.md` — add a Session entry recording: the rename from the RFC's placeholder `.amarantha/config` to `amarantha.config.json`, and that this milestone retires the hardcoded `personalWebsiteRegistry` fallback.

---

## File summary (new/changed)

**New:** `packages/theme/package.json`, `packages/theme/src/{tokens,mdxeditor-adapter,typography-adapter,index}.css`, `packages/theme/src/index.ts`, `packages/core/src/theme.ts`, `packages/core/src/config.ts`, `packages/core/src/registryMerge.ts` (+test), `packages/core/src/discoverConfig.ts` (+test), `packages/desktop/src/lib/tauriFsAdapter.ts`, `packages/desktop/src/tailwind.css`.

**Changed:** `packages/core/src/types.ts` (`EditorHost.resolveWorkspaceConfig`), `packages/desktop/src/lib/desktopHost.ts`, `packages/desktop/src/App.tsx` (mode/family/size dropdowns + `localStorage` preferences), `packages/desktop/src/App.css`, `packages/desktop/src/main.tsx` (Tailwind import), `packages/desktop/vite.config.ts` (alias + Tailwind plugin), `packages/desktop/package.json` (new devDeps), `packages/editor/src/AmaranthaEditor.tsx` (`proseClassName` + `proseSize` props), `packages/editor/src/jsx/jsx-editor.css`, `docs/decisions.md`.

## Out of scope (flag, don't build now)

- `.ts`/executable config and the workspace-trust gate it requires.
- Persisted theme-picker UI polish beyond a functional dropdown/swatch list.
- VS Code host implementation of `FsAdapter`/`resolveWorkspaceConfig`.
- Other base stylesheets / design-system adapters (MUI, etc.) — the `proseClassName` prop and the adapter-block pattern (§2, §4) are the seams for this, not a built integration.

## Verification

1. **Visual sweep:** cycle all 10 themes (5 families × 2 modes); check titlebar/buttons/source-view, MDXEditor content (heading, code block, link, table), and the JSX props panel together per theme. Inspect computed `--baseBg`/`--tw-prose-body` in devtools on at least 2 themes to confirm no raw hardcoded color leaks through.
2. **Mode = System:** no manual mode pick → toggle OS light/dark, confirm the app follows live (via the `matchMedia` change listener) without reload.
3. **Mode = Light/Dark pinned:** confirm the app stays pinned when toggling OS appearance.
4. **Family independent of mode:** pick a non-default family (e.g. Solarized) with mode = System, toggle OS light/dark, confirm it switches between `solarized-light`/`solarized-dark` (family stays fixed, only mode follows OS).
5. **Config — monorepo:** nested `amarantha.config.json` overrides a parent (non-`root`) config's `theme` (family) and one same-name component; unrelated parent components still present.
6. **Config — microrepo:** single `root: true` config, confirm the walk stops there.
7. **Config — none found:** falls back to empty registry + `"ember"` default family, no crash, walk never reaches beyond a reasonable bound.
8. **Tailwind:** confirm `prose` utility classes actually generate for `packages/editor/src/AmaranthaEditor.tsx`'s usage (not silently tree-shaken by content detection missing the sibling package).
9. **Prose size:** cycle all 5 sizes in the dropdown, confirm each of `prose-sm/base/lg/xl/2xl` actually changed the rendered type scale (i.e. all 5 were generated by Tailwind, not just whichever is used as the default).
10. Run `npm test --workspaces --if-present` and `npm run typecheck` from repo root.
