import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ComponentDefinition, ComponentRegistry } from "@amarantha/core";
import { AmaranthaEditor } from "../AmaranthaEditor";

// jsdom has no layout engine, so Range/Element don't implement real getBoundingClientRect —
// FloatingToolbar only needs *a* rect back to treat the selection as non-empty.
Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 10, bottom: 10, width: 10, height: 10 }) as DOMRect;

/**
 * Selects the full text contents of `el` via the real Selection API and fires the
 * `selectionchange` event FloatingToolbar listens for — the same technique
 * useSelectionStats.test.ts uses on the desktop package for the same API.
 */
function selectContents(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  act(() => {
    document.dispatchEvent(new Event("selectionchange"));
  });
}

const definitions: ComponentDefinition[] = [
  { name: "Mermaid", kind: "flow", props: { chart: { type: "expression", required: true } } },
];

const registry: ComponentRegistry = {
  resolve: (name) => definitions.find((d) => d.name === name),
  list: () => definitions,
};

describe("FloatingToolbar chrome exclusion", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it("appears when selecting real MDX paragraph text", () => {
    render(<AmaranthaEditor value={"Hello world, this is selectable.\n"} onChange={() => {}} mode="rich" />);

    const paragraph = screen.getByText("Hello world, this is selectable.");
    selectContents(paragraph);

    expect(screen.queryByRole("toolbar")).toBeTruthy();
  });

  it("does not appear when selecting the frontmatter panel's own Done/Edit-as-YAML button", () => {
    const markdown = '---\ntitle: "Draft"\n---\n\nBody text.\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    // Enter raw YAML mode so the toggle button reads "Done" (the app-chrome
    // control from the reported bug), then select its own text.
    fireEvent.click(screen.getByTestId("frontmatter-raw-toggle"));
    selectContents(screen.getByTestId("frontmatter-raw-toggle"));

    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("does not appear when selecting the Mermaid props panel's own Edit/View toggle", () => {
    const markdown = '<Mermaid chart="graph TD; A-->B;" />\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={registry} />);

    const toggle = screen.getByTestId("mermaid-toggle-code");
    selectContents(toggle);

    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
