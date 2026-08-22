import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from "mdast-util-mdx-jsx";
import type { ComponentPropDefinition } from "@amarantha/core";

type AnyJsxAttribute = MdxJsxAttribute | MdxJsxExpressionAttribute;

/**
 * Reads a JSX attribute's current value out of an mdast-util-mdx-jsx
 * attributes array into the plain-string form our prop fields edit.
 * A bare boolean attribute (`<Img framed />`, value === null/undefined)
 * reads as "true"; an absent attribute reads as "".
 */
export function readAttributeValue(attributes: readonly AnyJsxAttribute[], propName: string): string {
  const attr = attributes.find((a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === propName);
  if (!attr) return "";
  const { value } = attr;
  if (value == null) return "true";
  if (typeof value === "string") return value;
  return value.value; // mdxJsxAttributeValueExpression
}

/**
 * Builds the replacement MdxJsxAttribute for one prop given the field's
 * current string value, or null if the prop should be omitted entirely
 * (empty string, or a false boolean).
 */
export function buildAttribute(
  propName: string,
  propType: ComponentPropDefinition["type"],
  value: string
): MdxJsxAttribute | null {
  if (propType === "boolean") {
    return value === "true" ? { type: "mdxJsxAttribute", name: propName, value: null } : null;
  }
  if (value === "") return null;
  if (propType === "string" || propType === "enum") {
    return { type: "mdxJsxAttribute", name: propName, value };
  }
  // number, expression
  return {
    type: "mdxJsxAttribute",
    name: propName,
    value: { type: "mdxJsxAttributeValueExpression", value },
  };
}

/**
 * Rebuilds a full attributes array for a JSX node given the registry's
 * prop schema and the editor's current field values, preserving any
 * attribute not covered by the schema untouched — including spread
 * expression attributes (`{...rest}`), which have no `name` to match on.
 */
export function buildAttributes(
  currentAttributes: readonly AnyJsxAttribute[],
  props: Record<string, ComponentPropDefinition>,
  values: Record<string, string>
): AnyJsxAttribute[] {
  const knownNames = new Set(Object.keys(props));
  const unmanaged = currentAttributes.filter(
    (a) => a.type !== "mdxJsxAttribute" || !knownNames.has(a.name)
  );
  const managed = Object.entries(props)
    .map(([name, prop]) => buildAttribute(name, prop.type, values[name] ?? ""))
    .filter((a): a is MdxJsxAttribute => a !== null);
  return [...unmanaged, ...managed];
}
