import type { JsxComponentDescriptor, JsxEditorProps, JsxPropertyDescriptor } from "@mdxeditor/editor";
import type { ComponentDefinition, ComponentPropDefinition, ComponentRegistry } from "@amarantha/core";
import { AmaranthaJsxEditor } from "./AmaranthaJsxEditor";
import { UnknownJsxEditor } from "./UnknownJsxEditor";

function toMdxEditorPropType(type: ComponentPropDefinition["type"]): JsxPropertyDescriptor["type"] {
  // MDXEditor's own descriptor only distinguishes string/number/expression;
  // our richer boolean/enum types don't change how *we* render (that's
  // AmaranthaJsxEditor's job) but still need a value here for MDXEditor's
  // own bookkeeping (e.g. insertJsx$ defaults).
  if (type === "number") return "number";
  if (type === "boolean") return "expression";
  return "string";
}

function toJsxPropertyDescriptors(definition: ComponentDefinition): JsxPropertyDescriptor[] {
  return Object.entries(definition.props).map(([name, prop]) => ({
    name,
    type: toMdxEditorPropType(prop.type),
    required: prop.required,
  }));
}

function toDescriptor(definition: ComponentDefinition): JsxComponentDescriptor {
  return {
    name: definition.name,
    kind: definition.kind,
    props: toJsxPropertyDescriptors(definition),
    hasChildren: definition.children != null && definition.children !== "none",
    Editor: (editorProps: JsxEditorProps) => <AmaranthaJsxEditor {...editorProps} definition={definition} />,
  };
}

/**
 * Builds MDXEditor's JsxComponentDescriptor[] from an Amarantha
 * ComponentRegistry, plus flow/text catch-alls so any component without a
 * registry entry still renders (safely, without editing) via UnknownJsxEditor
 * rather than erroring or being silently dropped.
 */
export function createJsxComponentDescriptors(registry: ComponentRegistry): JsxComponentDescriptor[] {
  const definitions = registry.list?.() ?? [];
  return [
    ...definitions.map(toDescriptor),
    { name: "*", kind: "flow", props: [], hasChildren: true, Editor: UnknownJsxEditor },
    { name: "*", kind: "text", props: [], hasChildren: true, Editor: UnknownJsxEditor },
  ];
}
