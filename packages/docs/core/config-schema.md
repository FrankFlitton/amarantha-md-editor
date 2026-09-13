# Config Schema Reference

This page is the full field-by-field reference for `amarantha.config.json`.
For how the file is discovered and merged across a repo, see
[Configuration](/core/configuration); for the concepts these fields drive,
see [Custom Components](/core/custom-components) and
[Frontmatter](/core/frontmatter).

The file is validated against a JSON Schema
(`packages/vscode/schemas/amarantha.config.schema.json`, draft-07) that's
the canonical source for this page — it's what powers the VS Code
extension's autocomplete, hover docs, and validation, and it's kept
hand-in-sync with `AmaranthaConfig`/`ComponentDefinition` in
`packages/core/src/types.ts` and `config.ts`. Every object below sets
`additionalProperties: false`, so an unrecognized key is a validation
error, not silently ignored.

## Top level

| Field | Type | Required | Notes |
|---|---|---|---|
| `root` | `boolean` | no | Stop upward config discovery at this file (ESLint-style), even short of the filesystem root. |
| `theme` | `"ember" \| "minimal" \| "solarized" \| "matrix" \| "cream"` | no | A palette opinion only — never pins light/dark mode, which stays a separate user preference. |
| `components` | [`ComponentDefinition[]`](#componentdefinition) | no | Declarative per-repository JSX component registry. |
| `frontmatter` | `Record<string, `[`FrontmatterFieldDefinition`](#frontmatterfielddefinition)`>` | no | Declares known frontmatter fields for this repo. Not mandatory for every document — undeclared fields still edit fine, just as plain text. |
| `imagePrefix` | `string` | no | A directory, relative to this config file, to also try when a markdown image `src` doesn't resolve relative to the document itself. Covers Jamstack-style repos where content and public assets live in separate trees. |

## `ComponentDefinition`

One entry in `components`, describing a single custom JSX/MDX tag (e.g.
`<Mermaid>`, `<YouTube>`).

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | **yes** | The exact JSX tag name as it appears in source, including casing — e.g. `Mermaid`, or a lower-case override like `pre`. |
| `displayName` | `string` | no | Label shown in the props editor's header. Falls back to `name`. |
| `kind` | `"flow" \| "text"` | **yes** | `"flow"` for a block-level element (its own line, like `<Mermaid>`); `"text"` for something that sits inline with prose. Matches MDXEditor's own `JsxComponentDescriptor.kind`. |
| `props` | `Record<string, `[`ComponentPropDefinition`](#componentpropdefinition--frontmatterfielddefinition)`>` | **yes** | One entry per prop the props editor should render a field for. An empty object (`{}`) is valid — the component still gets picked up by the registry, just with no editable props. |
| `children` | `"none" \| "markdown" \| "mdx" \| "opaque"` | no | How the tag's children are treated, when it has any. |

## `ComponentPropDefinition` / `FrontmatterFieldDefinition`

These two share the same shape — one for a JSX component's props, the other
for a declared frontmatter key — kept as separate types because component
props and document metadata are expected to diverge over time, not because
the fields differ today.

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | [`PropType`](#proptype) | **yes** | Which field widget the props/frontmatter editor renders. |
| `required` | `boolean` | no | Marks the field visually (a `*`) in the editor. Not enforced as a hard validation error on save. |
| `values` | `string[]` | no | Allowed values, only meaningful when `type` is `"enum"` — rendered as a `<select>`. |
| `description` | `string` | no | Shown as hover/help text next to the field, and in VS Code's own hover-on-schema tooltip. |

## `PropType`

| Value | Editor widget | Use for |
|---|---|---|
| `"string"` | plain text input | Short free text — a title, an id, a URL. |
| `"number"` | number input | Numeric props. |
| `"boolean"` | checkbox | Bare/boolean JSX attributes (`<Img framed />`). |
| `"enum"` | `<select>`, populated from `values` | A prop with a fixed set of allowed values. |
| `"expression"` | monospace textarea, edited as raw source | A prop whose value is a JS expression rather than a JSON-shaped literal — multi-line Mermaid chart source, or a nested object/array literal (e.g. `UserJourneyMap`'s persona/steps data) that isn't strict JSON. Edited as text, not a structured sub-editor. |

## Full example

```json
{
  "theme": "ember",
  "imagePrefix": "public",
  "frontmatter": {
    "title": { "type": "string", "required": true },
    "status": {
      "type": "enum",
      "values": ["draft", "published", "archived"],
      "description": "Publication status shown in the site's index pages."
    }
  },
  "components": [
    {
      "name": "YouTube",
      "kind": "flow",
      "props": {
        "id": { "type": "string", "required": true, "description": "YouTube video id" }
      }
    },
    {
      "name": "Img",
      "kind": "flow",
      "props": {
        "src": { "type": "string", "required": true },
        "alt": { "type": "string" },
        "framed": { "type": "boolean" },
        "tall": { "type": "boolean" }
      }
    },
    {
      "name": "Mermaid",
      "kind": "flow",
      "props": {
        "chart": { "type": "expression", "required": true, "description": "Mermaid diagram source" },
        "title": { "type": "string" }
      }
    }
  ]
}
```

## Unregistered components

A JSX tag that appears in a document but has no matching `ComponentDefinition`
isn't an error. It falls back to a catch-all editor that leaves the node
completely untouched — no props UI, no rewriting to generic HTML, no data
loss on save. Registering a component is how you *opt in* to a structured
props editor for it, not a requirement for the document to open.
