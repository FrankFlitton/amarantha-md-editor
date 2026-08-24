import { javascript } from "@codemirror/lang-javascript";
import { parseMixed, type Input, type NestedParse, type SyntaxNodeRef } from "@lezer/common";

/**
 * Finds the end (exclusive) of a JSX opening/self-closing tag starting at
 * `from` in `text` — e.g. `<UserJourneyMap ... />` or `<Img ... >` — by
 * scanning forward while tracking string-literal and `{expression}` nesting
 * depth, so a `/>`/`>` inside a quoted attribute value or an expression
 * (`chart={\`...>...\`}`) doesn't end the scan early. Returns null if the
 * tag never closes within `text` (an unterminated/malformed tag — the
 * caller should then leave that content unhighlighted rather than guess).
 *
 * Deliberately does not chase a matching `</Component>` closing tag for the
 * "has children" form: every component in this app's real registries today
 * is used self-closing (confirmed by the RFC's Personal-Website content
 * survey), so this only ever needs to find the opening tag's own close —
 * content after an opening tag with children falls back to normal
 * markdown/prose highlighting, a non-regression from before this existed.
 */
export function scanJsxTagEnd(text: string, from: number): number | null {
  let i = from;
  let depth = 0;
  let quote: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && ch === "/" && text[i + 1] === ">") return i + 2;
    if (depth === 0 && ch === ">") return i + 1;
    i++;
  }
  return null;
}

// Matches a component tag start: an uppercase-leading tag name, the MDX
// convention this app's own ComponentRegistry already relies on (every
// ComponentDefinition.name in every registry is capitalized) to tell a
// component apart from a lowercase literal HTML element.
const JSX_TAG_START = /^(\s*)<[A-Z][A-Za-z0-9.]*/;

const jsxParser = javascript({ jsx: true }).language.parser;

/**
 * A `wrap` (mixed-language parse) for `@codemirror/lang-markdown`'s
 * `markdown({ extensions: [{ wrap: jsxNestingWrap }] })`: when a Markdown
 * `Paragraph` node's raw text starts with a capitalized JSX tag, nest-parses
 * just that tag (via scanJsxTagEnd, above) with the real JS/JSX grammar —
 * giving genuine per-token highlighting (JSXAttribute, ObjectExpression,
 * ArrayExpression, String, Number, ...) instead of CommonMark's own
 * HTML-block detection, which doesn't recognize `<Tag attr={...}>` as a tag
 * at all once `{`/`}` appear (they're not valid inside an HTML5 tag per the
 * spec CommonMark's HTML-block rule follows) and silently misparses it as
 * broken inline content — confirmed against the real `@lezer/markdown`
 * parser before building this, not assumed. A `Paragraph`'s bounds already
 * span the whole tag as one unit in every real sample checked (component
 * usages in this app's content are always self-closing with no blank line
 * inside their attributes), so no custom block-level parser was needed —
 * this reuses the boundary the base grammar already produces.
 */
export const jsxNestingWrap = parseMixed((node: SyntaxNodeRef, input: Input): NestedParse | null => {
  if (node.type.name !== "Paragraph") return null;
  const text = input.read(node.from, node.to);
  const match = JSX_TAG_START.exec(text);
  if (!match) return null;
  const start = match[1].length;
  const end = scanJsxTagEnd(text, start);
  if (end === null) return null;
  return { parser: jsxParser, overlay: [{ from: node.from + start, to: node.from + end }] };
});
