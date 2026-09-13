# Source-Preserving Editing

"Source-preserving" is Amarantha's load-bearing design goal: edits round-trip
back to Markdown without silently rewriting formatting you didn't touch —
list marker style, quote style, line wrapping, and so on.

## Why this matters

Most rich Markdown editors parse your file into a tree, let you edit the
tree, and then reserialize the whole thing back to text. That reserialization
step is where formatting gets normalized away — a `-` bullet list becomes
`*`, a wrapped paragraph gets rejoined onto one line, a blockquote's `>`
spacing changes. None of that is a content change, but it shows up as a
large, noisy diff.

## How it works

Amarantha edits with [MDXEditor](https://mdxeditor.dev)/Lexical as the
parse/serialize substrate, then runs the result through
`reconcileMarkdown` (`@amarantha/core`) before writing to disk:

```ts
import { reconcileMarkdown } from "@amarantha/core";

// original: the untouched file text
// serialized: MDXEditor's freshly-serialized output
const preserved = reconcileMarkdown(original, serialized);
```

`reconcileMarkdown` diffs the old and new mdast trees and only reserializes
the nodes that actually changed. Untouched nodes keep their original source
text byte-for-byte, so a single-word edit produces a single-line diff instead
of a whole-file rewrite.

## Frontmatter is preserved the same way

YAML frontmatter gets the same treatment, but via a dedicated path (see
[Frontmatter](/core/frontmatter)) built on `yaml`'s `Document` API rather
than a lossy parse/dump round trip — editing one key never disturbs another
key's order, comments, or quoting.
