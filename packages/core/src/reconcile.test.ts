import { describe, expect, it } from "vitest";
import { reconcileMarkdown } from "./reconcile";

const SIMPLE_FIXTURE = `# Hello

This is a paragraph with **bold** and *italic* text, plus a [link](https://example.com).

- one
- two
- three
`;

describe("reconcileMarkdown", () => {
  it("returns the original bytes exactly when nothing changed", () => {
    // Simulates MDXEditor's own normalization: it re-emits the identical
    // content with different marker style (list bullets, emphasis) even
    // though the user made no edit at all — the exact Session 1 gap.
    const normalized = `# Hello

This is a paragraph with **bold** and _italic_ text, plus a [link](https://example.com).

* one
* two
* three
`;
    expect(reconcileMarkdown(SIMPLE_FIXTURE, normalized)).toBe(SIMPLE_FIXTURE);
  });

  it("keeps an untouched list's original bullet style when a separate paragraph is edited", () => {
    const edited = `# Hello

This is a paragraph with **bold** and _italic_ text, plus a [link](https://example.com) and more.

* one
* two
* three
`;
    const result = reconcileMarkdown(SIMPLE_FIXTURE, edited);
    expect(result).toContain("- one\n- two\n- three");
    expect(result).toContain("and more");
  });

  it("reflects an inserted paragraph using the edited text's own content", () => {
    const edited = `# Hello

This is a paragraph with **bold** and _italic_ text, plus a [link](https://example.com).

A brand-new paragraph.

* one
* two
* three
`;
    const result = reconcileMarkdown(SIMPLE_FIXTURE, edited);
    expect(result).toContain("A brand-new paragraph.");
    expect(result).toContain("- one\n- two\n- three");
  });

  it("reflects a deleted paragraph", () => {
    const edited = `# Hello

* one
* two
* three
`;
    const result = reconcileMarkdown(SIMPLE_FIXTURE, edited);
    expect(result).not.toContain("This is a paragraph");
    expect(result).toContain("- one\n- two\n- three");
  });

  it("preserves an unchanged YAML frontmatter block verbatim, including comments and quoting", () => {
    const original = `---
title: "Hello" # a comment
tags:
  - a
  - b
---

Body text.
`;
    const normalized = `---
title: "Hello" # a comment
tags:
  - a
  - b
---

Body text, but longer now.
`;
    const result = reconcileMarkdown(original, normalized);
    expect(result).toContain('title: "Hello" # a comment');
    expect(result).toContain("Body text, but longer now.");
  });

  it("falls back to the edited text when the original fails to parse safely (defensive, not expected in practice)", () => {
    // mdast-util-from-markdown practically never throws on arbitrary text,
    // so this exercises the fallback path via an empty-tree edge case instead.
    expect(reconcileMarkdown("", "# Only in edited\n")).toBe("# Only in edited\n");
  });

  it("preserves an unchanged HTML/JSX-like block (opaque to this reconciler's CommonMark-only parser)", () => {
    const original = `# Doc

<CustomWidget foo="bar" />

More text.
`;
    const edited = `# Doc

<CustomWidget foo="bar" />

More text, extended.
`;
    const result = reconcileMarkdown(original, edited);
    expect(result).toContain('<CustomWidget foo="bar" />');
    expect(result).toContain("More text, extended.");
  });
});
