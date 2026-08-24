import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Colors are all `--am-*` custom properties, not fixed hex values, so
 * source-mode highlighting follows every one of this app's themes (and a
 * host's own inherited-theme adapter, e.g. VS Code's) automatically — the
 * same convention every other themed surface in this app follows. Tags are
 * standard @lezer/highlight tags, shared across every nested language
 * (Markdown, YAML, and — via jsxNesting.ts — real JS/JSX), so this one
 * style covers all of them without per-language special-casing.
 */
export const amaranthaHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "var(--am-text)", fontWeight: "600" },
  { tag: t.strong, fontWeight: "600" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  // A markdown image/link (![alt](url) / [text](url)) is 3 distinct node
  // types in @lezer/markdown's own default styleTags config (confirmed
  // against its real source, not assumed): the ![ ] ( ) marks are
  // LinkMark → t.processingInstruction (same tag every other markdown
  // syntax mark below uses — #, -, >, **, `` ` ``), the destination is a
  // dedicated URL node → t.url, and the alt/link text has no node of its
  // own at all — it just inherits the outer Image/Link node's own tag,
  // t.link. Giving all three the same color (the previous version of this
  // style did) is what made an image line read as one flat color; this
  // now reads as three deliberately different treatments: marks pop in
  // accent (so links/images announce themselves while scanning, same as
  // headings/lists below), the actual alt/link text reads as normal prose,
  // and the URL — real content, but not what a reader needs to actually
  // read — is muted.
  { tag: t.link, color: "var(--am-text)" },
  { tag: t.url, color: "var(--am-text-muted)" },
  { tag: t.monospace, color: "var(--am-text)" },
  { tag: t.quote, color: "var(--am-text-muted)" },
  { tag: [t.list, t.contentSeparator, t.processingInstruction], color: "var(--am-accent)" },
  { tag: t.meta, color: "var(--am-text-muted)" },
  { tag: [t.propertyName, t.keyword], color: "var(--am-accent)" },
  { tag: [t.atom, t.bool, t.number], color: "var(--am-text)" },
  { tag: t.tagName, color: "var(--am-accent)" },
  { tag: t.attributeName, color: "var(--am-text)" },
  { tag: [t.attributeValue, t.string], color: "var(--am-text-muted)" },
  { tag: t.angleBracket, color: "var(--am-text-muted)" },
  { tag: t.comment, color: "var(--am-text-muted)", fontStyle: "italic" },
  { tag: t.punctuation, color: "var(--am-text-muted)" },
  { tag: t.invalid, color: "#e5484d" },
]);
