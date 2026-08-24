import { markdown } from "@codemirror/lang-markdown";
import { yamlFrontmatter, yaml } from "@codemirror/lang-yaml";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { StreamLanguage, type Language, type LanguageSupport } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { jsxNestingWrap } from "./jsxNesting";

/**
 * Resolves a fenced code block's info string (```js, ```yaml, ...) to a
 * highlighting language. `js`/`ts` fences are parsed with `jsx: true` since
 * real content in this app's target repos writes JSX examples in fenced
 * blocks too, not just as literal document-level components.
 */
function fencedLanguageFor(info: string): Language | null {
  const lang = info.trim().split(/\s+/)[0]?.toLowerCase();
  switch (lang) {
    case "js":
    case "jsx":
    case "javascript":
      return javascript({ jsx: true }).language;
    case "ts":
    case "tsx":
    case "typescript":
      return javascript({ jsx: true, typescript: true }).language;
    case "json":
      return json().language;
    case "css":
      return css().language;
    case "html":
      return html().language;
    case "yaml":
    case "yml":
      return yaml().language;
    case "bash":
    case "sh":
    case "shell":
      return StreamLanguage.define(shell);
    default:
      // Includes "md" and "mermaid" — plain/unhighlighted, matching the
      // rich-mode codeBlockLanguages list's own "Text" fallback for
      // languages with no real grammar here.
      return null;
  }
}

/**
 * Markdown, with:
 *  - YAML frontmatter highlighted as real YAML (@codemirror/lang-yaml's
 *    `yamlFrontmatter` — the documented mechanism for exactly this,
 *    confirmed against its real .d.ts rather than hand-rolling a "switch
 *    language at the top few lines" extension).
 *  - Fenced code blocks highlighted per `fencedLanguageFor` above.
 *  - JSX/MDX component tags (`<UserJourneyMap ... />`) highlighted with the
 *    real JS/JSX grammar, block by block, via `jsxNestingWrap` (see
 *    jsxNesting.ts) — genuine per-token highlighting of attribute
 *    expressions (object/array literals, strings, numbers), not just
 *    tag-shaped HTML approximation. There is no dedicated MDX grammar for
 *    CodeMirror (confirmed via CodeMirror's own discussion forum before
 *    building this) and CommonMark's own HTML-block detection doesn't even
 *    recognize `<Tag attr={...}>` as a tag once `{`/`}` appear — this wrap
 *    is what actually closes that gap.
 */
export function amaranthaSourceLanguage(): LanguageSupport {
  return yamlFrontmatter({
    content: markdown({
      codeLanguages: fencedLanguageFor,
      extensions: [{ wrap: jsxNestingWrap }],
    }),
  });
}
