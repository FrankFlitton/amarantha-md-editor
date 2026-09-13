# Themes & Fonts

The web, desktop, and Chrome-extension surfaces share one theme and font
system from `@amarantha/theme`. (VS Code is the one exception — see
[VS Code Extension](/platforms/vscode).)

## Themes

A theme is a `ThemeFamily` × `ThemeMode` pair:

```ts
type ThemeFamily = "ember" | "minimal" | "solarized" | "matrix" | "cream";
type ThemeMode = "light" | "dark";
type ThemeId = `${ThemeFamily}-${ThemeMode}`; // e.g. "ember-light"
type ThemeModePreference = ThemeMode | "system";
```

Five families × two modes gives ten themes total. Each is a CSS rule keyed
on `[data-theme="<id>"]` on the app root, defining the same 8-variable
token set — `--am-bg`, `--am-surface`, `--am-border`, `--am-text`,
`--am-text-muted`, `--am-accent`, `--am-accent-text`, `--am-selection`.
`:root:not([data-theme])` provides the default (light/dark driven by
`prefers-color-scheme`) when no explicit theme is chosen.

A repo's `amarantha.config.json` can set `theme` to pick a default family —
that's a palette *opinion* only; it never pins light vs. dark mode, which
stays a separate, independent user preference (`ThemeModePreference`).

## Prose size

`ProseSize` (`"sm" | "base" | "lg" | "xl" | "2xl"`) controls the rendered
text scale independently of theme, for readability preferences that have
nothing to do with color.

## Fonts

`FontPreference` (`@amarantha/core`) describes a font choice for each of
three independent slots — body/heading (`sans`), and `mono` for code —
sourced one of three ways:

- **Bundled** — Geist and Geist Mono, shipped with the app, zero network
  fetch.
- **Curated Fontsource pick** — a short, opinionated shortlist
  (`CURATED_FONTS` in `@amarantha/theme`: Inter, Manrope, IBM Plex Sans,
  Space Grotesk, Work Sans, Libre Baskerville, and Playfair Display for
  body/heading; JetBrains Mono, IBM Plex Mono, Space Mono, and Fira Code
  for code), loaded on demand from Fontsource.
- **Custom Fontsource ID / system font** — any of the ~2000 fonts in the
  full [Fontsource](https://fontsource.org) catalog by id, fetched and
  cached through the same mechanism as the curated list, or a locally
  installed system font by name.

Body and heading share one font pool rather than separate sans/serif pools
— splitting them would make it impossible to pick one typeface (e.g. a
serif) for both, which is a normal thing to want. Mono stays its own pool,
since a proportional font doesn't serve the "code font" use case.
