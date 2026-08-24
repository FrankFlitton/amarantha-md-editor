import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { minimalSetup } from "codemirror";
import type { ProseSize } from "@amarantha/core";
import { amaranthaHighlightStyle, amaranthaSourceLanguage } from "@amarantha/source";
import "./SourceView.css";

export interface SourceViewProps {
  value: string;
  onChange: (next: string) => void;
  /** Same size picker rich mode's prose uses (default "base") — see
   *  SourceView.css's --am-source-font-size per size. A VS Code host
   *  overrides this with the user's actual VS Code editor font size
   *  instead (see vscode-theme-adapter.css) — that rule's extra selector
   *  specificity wins over the plain per-size class here. */
  proseSize?: ProseSize;
}

// Static literal lookup, not a template literal — same reasoning as
// AmaranthaEditor's PROSE_SIZE_CLASS: keeps every class name a real string
// literal in source, not required for Tailwind detection here (this file
// defines its own plain CSS, not Tailwind utilities) but still the safer,
// exhaustive-by-construction pattern.
const SOURCE_SIZE_CLASS: Record<ProseSize, string> = {
  sm: "source-view-size-sm",
  base: "source-view-size-base",
  lg: "source-view-size-lg",
  xl: "source-view-size-xl",
  "2xl": "source-view-size-2xl",
};

// Font/spacing only — colors come entirely from amaranthaHighlightStyle's
// --am-* tokens and the surrounding .amarantha-app cascade, not from here.
// No padding here: the wrapper <div className="source-view"> that hosts
// this EditorView already carries the app's existing 24px padding (see
// each host's own .source-view CSS, unchanged) — CodeMirror just fills that
// already-padded box. Monospace is a deliberate change from source mode's
// previous plain <textarea> (which inherited the app's proportional
// --am-font-sans): once this is a real syntax-highlighted view, a
// code-editor-style monospace font is what makes markdown markers (#, -,
// ---, backticks) and JSX tags actually align and read the way syntax
// highlighting is meant to.
const sourceViewTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    fontSize: "var(--am-source-font-size, 13px)",
  },
  ".cm-content": {
    fontFamily: "var(--am-source-font-family, var(--am-font-mono))",
    caretColor: "var(--am-text)",
    padding: 0,
  },
  ".cm-scroller": {
    lineHeight: "1.6",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--am-selection) !important",
  },
});

/**
 * The raw-markdown editing surface: YAML frontmatter, Markdown, and
 * JSX/MDX component tags all get real syntax highlighting via CodeMirror 6
 * (see sourceHighlighting.ts) — replacing what was previously a plain
 * unstyled <textarea>.
 *
 * `value` only seeds the initial document, the same "prop seeds once, isn't
 * reactively re-synced" contract MDXEditor's own `markdown` prop already
 * has elsewhere in this codebase (AmaranthaEditor is remounted via a `key`
 * change on file/mode switches — see desktop's App.tsx and the VS Code
 * webview's WebviewApp.tsx — which is what reflects an externally-changed
 * value here too, consistently with how rich mode already behaves).
 */
export function SourceView({ value, onChange, proseSize = "base" }: SourceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept current every render (not a dep of the mount effect below) so the
  // update listener always calls the latest onChange without needing to
  // tear down and recreate the whole EditorView whenever the parent
  // re-renders with a new function identity.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          minimalSetup,
          EditorView.lineWrapping,
          amaranthaSourceLanguage(),
          syntaxHighlighting(amaranthaHighlightStyle),
          sourceViewTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });

    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`source-view ${SOURCE_SIZE_CLASS[proseSize]}`}
      data-testid="amarantha-source-view"
    />
  );
}
