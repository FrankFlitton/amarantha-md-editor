# Frontmatter

Amarantha reads and edits YAML frontmatter without disturbing anything you
didn't touch — key order, comments, and quoting style all survive an edit to
an unrelated key.

## Why not a normal YAML parse/dump?

A typical "load into an object, mutate, dump back to YAML" round trip is
lossy: dumping regenerates the whole block from the in-memory object,
losing comments and often reordering or re-quoting keys. Amarantha instead
builds on the `yaml` package's `Document` API, which keeps a mutable AST of
the original YAML — mutating one key edits that key's node in place and
leaves everything else untouched.

## Declaring known fields

A repo can declare its known frontmatter fields in `amarantha.config.json`
(see [Configuration](/core/configuration)):

```ts
interface FrontmatterFieldDefinition {
  type: "string" | "number" | "boolean" | "enum" | "expression";
  required?: boolean;
  values?: readonly string[];
  description?: string;
}
```

This is structurally similar to `ComponentPropDefinition` (see
[Custom Components](/core/custom-components)) but kept as its own type,
since document-metadata fields — like dates or agent-facing descriptions —
are expected to diverge from component-prop needs over time. Declaring a
field isn't mandatory for every document; it's what lets Amarantha's
frontmatter panel offer typed editing (a dropdown for an `enum`, a checkbox
for `boolean`) instead of falling back to raw text for every field.

## Reading frontmatter for display

```ts
import { readFrontmatterEntries } from "@amarantha/core";

const entries = readFrontmatterEntries(yamlBlockText);
```

This is the read-only counterpart used to populate a frontmatter panel
without needing a full document mutation round trip.
