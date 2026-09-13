# Desktop App

`@amarantha/desktop` is a [Tauri](https://tauri.app) + React app. The
filesystem is the source of truth — there's no intermediate document server
or sync layer, `AmaranthaEditor` talks straight to files through a Tauri
`EditorHost` implementation (`desktopHost.ts`, using
`packages/desktop/src/lib/tauriFsAdapter.ts` for
[config discovery](/core/configuration)).

::: warning Not yet released
Desktop distribution (signed macOS/Windows builds) is still in progress —
see the [releases page](https://github.com/FrankFlitton/amarantha-md-editor/releases)
for current status.
:::

## Running locally

```sh
npm run dev
```

## Building

```sh
npm run build
```

Builds the Tauri app via `npm run build --workspace @amarantha/desktop`.
