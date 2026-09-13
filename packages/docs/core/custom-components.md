# Custom Components

Amarantha renders custom JSX/MDX components — diagrams, embeds, callouts —
inline in the rich view, driven by a declarative registry rather than
hardcoded per-component support.

## Declaring a component

Components are declared in `amarantha.config.json` (see
[Configuration](/core/configuration)) as `ComponentDefinition`s:

```ts
interface ComponentDefinition {
  name: string;
  displayName?: string;
  /** Block ("flow") vs inline ("text") JSX element. */
  kind: "flow" | "text";
  props: Record<string, ComponentPropDefinition>;
  children?: "none" | "markdown" | "mdx" | "opaque";
}

interface ComponentPropDefinition {
  type: "string" | "number" | "boolean" | "enum" | "expression";
  required?: boolean;
  values?: readonly string[];
  description?: string;
}
```

`kind` matches MDXEditor's own `JsxComponentDescriptor.kind` — `"flow"` for a
block-level element like `<Mermaid>`, `"text"` for something that sits inline
with prose. See the [Config Schema Reference](/core/config-schema) for every
field, the `expression` prop type, and a full worked example.

## Registries

`@amarantha/mdx` builds the actual `ComponentRegistry` a host resolves
against:

```ts
interface ComponentRegistry {
  resolve(name: string): ComponentDefinition | undefined;
  list?(): readonly ComponentDefinition[];
}
```

`createRegistry` (`@amarantha/mdx`) turns a repo's declared
`ComponentDefinition[]` into one of these. `personalWebsiteComponents.ts` is
a worked example registry used for real-world QA against an actual content
repo.

## JSX editing UI

Editing a JSX component's props happens through Amarantha's own JSX editor
UI (`packages/editor/src/jsx`) — a fork of parts of MDXEditor's JSX/image
editor UI, adapted to read prop shapes from `ComponentDefinition` instead of
requiring a hand-written React form per component.
