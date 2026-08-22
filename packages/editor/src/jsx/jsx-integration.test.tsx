import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComponentDefinition, ComponentRegistry } from "@amarantha/core";
import { AmaranthaEditor } from "../AmaranthaEditor";
import type { MDXEditorMethods } from "@mdxeditor/editor";

const definitions: ComponentDefinition[] = [
  {
    name: "YouTube",
    kind: "flow",
    props: { id: { type: "string", required: true } },
  },
  {
    name: "Img",
    kind: "flow",
    props: {
      src: { type: "string", required: true },
      alt: { type: "string" },
      framed: { type: "boolean" },
    },
  },
];

const registry: ComponentRegistry = {
  resolve: (name) => definitions.find((d) => d.name === name),
  list: () => definitions,
};

describe("jsxPlugin + AmaranthaJsxEditor integration", () => {
  it("renders a props editor for a registered component with the right field values", () => {
    const markdown = '<YouTube id="dQw4w9WgXcQ" />\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    expect(screen.getByTestId("jsx-editor-YouTube")).toBeTruthy();
    const idField = screen.getByTestId("jsx-prop-id") as HTMLInputElement;
    expect(idField.value).toBe("dQw4w9WgXcQ");
  });

  it("renders a bare boolean attribute as a checked checkbox", () => {
    const markdown = '<Img src="/a.png" alt="a" framed />\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    const framedField = screen.getByTestId("jsx-prop-framed") as HTMLInputElement;
    expect(framedField.checked).toBe(true);
    const srcField = screen.getByTestId("jsx-prop-src") as HTMLInputElement;
    expect(srcField.value).toBe("/a.png");
  });

  it("round-trips edited props back into serialized markdown", () => {
    const markdown = '<YouTube id="old-id" />\n';
    const editorRef = createRef<MDXEditorMethods>();
    render(
      <AmaranthaEditor
        value={markdown}
        onChange={() => {}}
        mode="rich"
        componentRegistry={registry}
        editorRef={editorRef}
      />
    );

    expect(editorRef.current?.getMarkdown().trim()).toBe('<YouTube id="old-id" />');
  });

  it("renders an unregistered component via the catch-all without erroring", () => {
    const markdown = "<SomeUnknownThing foo=\"bar\" />\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    expect(screen.getByTestId("jsx-unknown-SomeUnknownThing")).toBeTruthy();
  });
});
