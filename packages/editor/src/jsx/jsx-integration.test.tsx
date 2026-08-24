import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComponentDefinition, ComponentRegistry } from "@amarantha/core";
import { AmaranthaEditor } from "../AmaranthaEditor";
import type { MDXEditorMethods } from "@mdxeditor/editor";

/**
 * Prop fields are persistent contentEditable elements (InlineEditableText),
 * not <input>/<textarea> — editing in a test means: focus it, set its
 * textContent directly (jsdom has no real typing), then blur to commit,
 * same technique frontmatter-integration.test.tsx uses for its fields.
 */
function typeInto(el: HTMLElement, text: string) {
  fireEvent.focus(el);
  el.textContent = text;
  fireEvent.blur(el);
}

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
  {
    name: "Mermaid",
    kind: "flow",
    props: { chart: { type: "expression", required: true } },
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
    const idField = screen.getByTestId("jsx-prop-id");
    expect(idField.textContent).toBe("dQw4w9WgXcQ");
  });

  it("renders a bare boolean attribute as a checked checkbox", () => {
    const markdown = '<Img src="/a.png" alt="a" framed />\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    const framedField = screen.getByTestId("jsx-prop-framed") as HTMLInputElement;
    expect(framedField.checked).toBe(true);
    const srcField = screen.getByTestId("jsx-prop-src");
    expect(srcField.textContent).toBe("/a.png");
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

  it("editing a text prop's contentEditable field commits and round-trips into serialized markdown", () => {
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

    typeInto(screen.getByTestId("jsx-prop-id"), "new-id");

    expect(editorRef.current?.getMarkdown().trim()).toBe('<YouTube id="new-id" />');
  });

  it("editing a multiline expression prop preserves embedded newlines through commit and serialization", () => {
    const markdown = "<Mermaid chart={`graph TD\n  A --> B`} />\n";
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

    fireEvent.click(screen.getByTestId("mermaid-toggle-code"));
    const chartField = screen.getByTestId("jsx-prop-chart");
    expect(chartField.getAttribute("contenteditable")).toBe("true");

    typeInto(chartField, "graph TD\n  A --> B\n  B --> C");

    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain("A --> B");
    expect(output).toContain("B --> C");
  });

  it("renders an unregistered component via the catch-all without erroring", () => {
    const markdown = "<SomeUnknownThing foo=\"bar\" />\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    expect(screen.getByTestId("jsx-unknown-SomeUnknownThing")).toBeTruthy();
  });
});
