import { describe, expect, it } from "vitest";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import type { ComponentPropDefinition } from "@amarantha/core";
import { buildAttribute, buildAttributes, readAttributeValue } from "./attributes";

describe("readAttributeValue", () => {
  it("reads a plain string attribute", () => {
    const attrs: MdxJsxAttribute[] = [{ type: "mdxJsxAttribute", name: "id", value: "abc123" }];
    expect(readAttributeValue(attrs, "id")).toBe("abc123");
  });

  it("reads an expression attribute's raw source", () => {
    const attrs: MdxJsxAttribute[] = [
      { type: "mdxJsxAttribute", name: "chart", value: { type: "mdxJsxAttributeValueExpression", value: "`graph TD\\nA-->B`" } },
    ];
    expect(readAttributeValue(attrs, "chart")).toBe("`graph TD\\nA-->B`");
  });

  it("reads a bare boolean attribute as \"true\"", () => {
    const attrs: MdxJsxAttribute[] = [{ type: "mdxJsxAttribute", name: "framed", value: null }];
    expect(readAttributeValue(attrs, "framed")).toBe("true");
  });

  it("reads a missing attribute as empty string", () => {
    expect(readAttributeValue([], "alt")).toBe("");
  });
});

describe("buildAttribute", () => {
  it("builds a plain string attribute", () => {
    expect(buildAttribute("id", "string", "abc123")).toEqual({
      type: "mdxJsxAttribute",
      name: "id",
      value: "abc123",
    });
  });

  it("omits a string attribute when empty", () => {
    expect(buildAttribute("alt", "string", "")).toBeNull();
  });

  it("builds a bare boolean attribute when true", () => {
    expect(buildAttribute("framed", "boolean", "true")).toEqual({
      type: "mdxJsxAttribute",
      name: "framed",
      value: null,
    });
  });

  it("omits a boolean attribute when false", () => {
    expect(buildAttribute("framed", "boolean", "")).toBeNull();
  });

  it("builds a number attribute as an expression", () => {
    expect(buildAttribute("width", "number", "42")).toEqual({
      type: "mdxJsxAttribute",
      name: "width",
      value: { type: "mdxJsxAttributeValueExpression", value: "42" },
    });
  });

  it("builds an expression attribute", () => {
    expect(buildAttribute("phases", "expression", "[{name:'a'}]")).toEqual({
      type: "mdxJsxAttribute",
      name: "phases",
      value: { type: "mdxJsxAttributeValueExpression", value: "[{name:'a'}]" },
    });
  });
});

describe("buildAttributes", () => {
  const props: Record<string, ComponentPropDefinition> = {
    id: { type: "string", required: true },
    framed: { type: "boolean" },
  };

  it("rebuilds managed attributes from current values", () => {
    const result = buildAttributes([], props, { id: "abc", framed: "true" });
    expect(result).toEqual([
      { type: "mdxJsxAttribute", name: "id", value: "abc" },
      { type: "mdxJsxAttribute", name: "framed", value: null },
    ]);
  });

  it("preserves attributes not covered by the schema", () => {
    const current: MdxJsxAttribute[] = [{ type: "mdxJsxAttribute", name: "data-extra", value: "keep-me" }];
    const result = buildAttributes(current, props, { id: "abc", framed: "" });
    expect(result).toContainEqual({ type: "mdxJsxAttribute", name: "data-extra", value: "keep-me" });
    expect(result).toContainEqual({ type: "mdxJsxAttribute", name: "id", value: "abc" });
    expect(result).toHaveLength(2);
  });
});
