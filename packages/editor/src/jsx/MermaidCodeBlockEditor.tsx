import { useState } from "react";
import { useCodeBlockEditorContext, type CodeBlockEditorProps } from "@mdxeditor/editor";
import { MermaidDiagram } from "./MermaidDiagram";
import "./jsx-editor.css";

/**
 * Custom codeBlockEditorDescriptors entry (registered in AmaranthaEditor.tsx)
 * for plain fenced ```mermaid blocks — the more common way people actually
 * write Mermaid in markdown, versus the registry's <Mermaid chart="..."/>
 * JSX component (see AmaranthaJsxEditor). Same view/edit split and toggle
 * placement as that component's chart field, for one consistent pattern
 * regardless of which form a document uses.
 */
export function MermaidCodeBlockEditor({ code }: CodeBlockEditorProps) {
  const { setCode } = useCodeBlockEditorContext();
  const [showCode, setShowCode] = useState(false);

  return (
    <div
      className="amarantha-jsx-editor amarantha-jsx-editor-flat"
      data-testid="mermaid-code-block-editor"
      contentEditable={false}
    >
      <div className="amarantha-jsx-editor-title">Mermaid</div>
      <button
        type="button"
        className="amarantha-jsx-editor-toggle"
        data-testid="mermaid-block-toggle-code"
        aria-label={showCode ? "View diagram" : "Edit code"}
        onClick={() => setShowCode((s) => !s)}
      >
        {showCode ? "View" : "Edit"}
      </button>
      {showCode ? (
        <textarea
          className="amarantha-jsx-prop-expression"
          data-testid="mermaid-block-source"
          value={code}
          spellCheck={false}
          onChange={(event) => setCode(event.target.value)}
        />
      ) : (
        <MermaidDiagram chart={code} />
      )}
    </div>
  );
}
