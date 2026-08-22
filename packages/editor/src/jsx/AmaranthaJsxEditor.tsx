import { useState } from "react";
import { useMdastNodeUpdater, type JsxEditorProps, type MdastJsx } from "@mdxeditor/editor";
import type { ComponentDefinition } from "@amarantha/core";
import { buildAttributes, readAttributeValue } from "./attributes";
import { PropField } from "./PropField";
import "./jsx-editor.css";

export interface AmaranthaJsxEditorProps extends JsxEditorProps {
  definition: ComponentDefinition;
}

/**
 * A Notion-style props editor for one registered JSX component: renders a
 * labeled field per declared prop, typed via the ComponentRegistry (not
 * MDXEditor's own 3-type JsxPropertyDescriptor), and commits edits back
 * into the mdast node via the public useMdastNodeUpdater() primitive.
 */
export function AmaranthaJsxEditor({ mdastNode, definition }: AmaranthaJsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater<MdastJsx>();

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const propName of Object.keys(definition.props)) {
      initial[propName] = readAttributeValue(mdastNode.attributes, propName);
    }
    return initial;
  });

  function commit(propName: string, next: string) {
    const updatedValues = { ...values, [propName]: next };
    setValues(updatedValues);
    updateMdastNode({
      attributes: buildAttributes(mdastNode.attributes, definition.props, updatedValues),
    });
  }

  return (
    <div className="amarantha-jsx-editor" data-testid={`jsx-editor-${definition.name}`} contentEditable={false}>
      <div className="amarantha-jsx-editor-title">{definition.displayName ?? definition.name}</div>
      {Object.entries(definition.props).map(([propName, prop]) => (
        <PropField
          key={propName}
          name={propName}
          prop={prop}
          value={values[propName] ?? ""}
          onCommit={(next) => commit(propName, next)}
        />
      ))}
    </div>
  );
}
