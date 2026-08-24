/// <reference types="vite/client" />

// @amarantha/editor's vendored toolbar (packages/editor/src/toolbar/) imports
// CSS modules; this webview typechecks that raw source directly (it's
// consumed via a Vite alias, not a prebuilt dist — see vite.webview.config.ts),
// so it needs the same ambient declaration editor/src/vite-env.d.ts provides
// for its own build.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
