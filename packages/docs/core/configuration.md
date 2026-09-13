# Configuration

A repository customizes Amarantha with an `amarantha.config.json` file.
Configuration is JSON-only by design — there is no `.ts`/executable config
path, so opening a repo never auto-executes code from it.

## Shape

```ts
interface AmaranthaConfig {
  /** Stop upward discovery at this file (ESLint-style), even short of the filesystem root. */
  root?: boolean;
  /** A palette opinion only — never pins light/dark mode, that stays a separate user preference. */
  theme?: ThemeFamily;
  components?: ComponentDefinition[];
  /** Declares known frontmatter fields for this repo. Not mandatory for every document. */
  frontmatter?: Record<string, FrontmatterFieldDefinition>;
  /**
   * A directory, relative to this config file, to also try when a markdown
   * image src doesn't resolve relative to the document itself. Covers
   * Jamstack-style repos where content and public assets live in separate
   * trees.
   */
  imagePrefix?: string;
}
```

See [Custom Components](/core/custom-components) for `ComponentDefinition`
and [Frontmatter](/core/frontmatter) for `FrontmatterFieldDefinition`, or the
[Config Schema Reference](/core/config-schema) for the full field-by-field
spec and a worked example.

## Discovery

`discoverWorkspaceConfig` walks upward from the document being edited,
looking for `amarantha.config.json` at every ancestor directory — stopping
at a config marked `root: true`, ESLint-style. Configs are folded together
root-most-first, so the closest config to the document wins for any
overlapping key (`theme`, `imagePrefix`), while `components` and
`frontmatter` are merged by name (`mergeComponentDefinitions` /
`mergeFrontmatterFields`) rather than replaced outright.

This lets a monorepo set repo-wide defaults at the root and override or add
to them in a subdirectory, without repeating the whole config.

## IntelliSense in VS Code

The VS Code extension ships a JSON Schema
(`packages/vscode/schemas/amarantha.config.schema.json`) for autocomplete,
hover docs, and validation while editing `amarantha.config.json` itself. It's
maintained by hand alongside `AmaranthaConfig` and
`ComponentDefinition`/`FrontmatterFieldDefinition` — see
[VS Code Extension](/platforms/vscode).
