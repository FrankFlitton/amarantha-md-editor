import type { JsxEditorProps } from "@mdxeditor/editor";
import "./jsx-editor.css";

/**
 * Catch-all editor for a JSX component with no registry entry. Renders
 * nothing interactive and calls no mdast-updating hooks, so the node
 * passes through unmodified — preserved source, editable via Source mode,
 * per the RFC's "unknown component stays source-preserved" requirement.
 *
 * Caveat: this does not visually render any children the node may have
 * (unlike AmaranthaJsxEditor's registered components, which have none in
 * practice today) — they're not shown in Rich mode, but since we never
 * call updateMdastNode, they round-trip unmodified on save. Needs manual
 * QA against a real unknown-component-with-children fixture to confirm.
 */
export function UnknownJsxEditor({ mdastNode }: JsxEditorProps) {
  const name = mdastNode.name ?? "fragment";
  return (
    <div className="amarantha-jsx-unknown" data-testid={`jsx-unknown-${name}`} contentEditable={false}>
      Unregistered component: &lt;{name}&gt; — edit via Source mode
    </div>
  );
}
