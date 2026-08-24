import { useState } from "react";
import { useCodeBlockEditorContext, type CodeBlockEditorProps } from "@mdxeditor/editor";
import { InlineEditableText } from "../InlineEditableText";
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
    <div className="amarantha-jsx-editor" data-testid="mermaid-code-block-editor" contentEditable={false}>
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
        <InlineEditableText
          className="amarantha-jsx-prop-value amarantha-jsx-prop-expression"
          testId="mermaid-block-source"
          ariaLabel="Mermaid chart source"
          value={code}
          multiline
          onCommit={setCode}
        />
      ) : (
        <MermaidDiagram chart={code} />
      )}
    </div>
  );
}
