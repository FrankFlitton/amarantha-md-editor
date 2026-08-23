import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { AmaranthaEditor } from "../AmaranthaEditor";

describe("codeBlockEditorDescriptors: fenced ```mermaid blocks", () => {
  it("renders a fenced mermaid block via the diagram editor, defaulting to the diagram view", () => {
    const markdown = "```mermaid\ngraph TD\n  A --> B\n```\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    expect(screen.getByTestId("mermaid-code-block-editor")).toBeTruthy();
    expect(screen.getByTestId("mermaid-preview")).toBeTruthy();
    expect(screen.queryByTestId("mermaid-block-source")).toBeNull();
  });

  it("does not intercept a plain ```js fenced block", () => {
    const markdown = "```js\nconst x = 1;\n```\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    expect(screen.queryByTestId("mermaid-code-block-editor")).toBeNull();
  });

  it("toggling to code shows the raw source of the fenced block", () => {
    // Editing the textarea and confirming the change round-trips through
    // getMarkdown() is verified live in a real browser instead of here:
    // MDXEditor's codeMirrorPlugin registers ambient CodeMirror machinery
    // that runs a DOM measurement pass (EditorView.measure, ultimately
    // Range.getClientRects) on export, which jsdom does not implement —
    // the same class of browser-only dependency Mermaid's own rendering
    // has (see MermaidDiagram.test.tsx). Confirmed working end-to-end via
    // the dev-browser skill: editing the textarea and switching back to
    // Source mode shows the edited chart text correctly.
    const markdown = "```mermaid\ngraph TD\n  A --> B\n```\n";
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    fireEvent.click(screen.getByTestId("mermaid-block-toggle-code"));
    const source = screen.getByTestId("mermaid-block-source") as HTMLTextAreaElement;
    expect(source.value).toBe("graph TD\n  A --> B");
    expect(screen.queryByTestId("mermaid-preview")).toBeNull();
  });
});
