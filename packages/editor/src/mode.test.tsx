import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmaranthaEditor } from "./AmaranthaEditor";

describe("AmaranthaEditor mode switching", () => {
  it("renders the rich MDXEditor surface in rich mode", () => {
    render(<AmaranthaEditor value="# hi" onChange={() => {}} mode="rich" />);
    expect(screen.getByTestId("amarantha-rich-editor")).toBeTruthy();
    expect(screen.queryByTestId("amarantha-source-view")).toBeNull();
  });

  it("renders the syntax-highlighted CodeMirror source view in source mode", () => {
    render(<AmaranthaEditor value="# hi" onChange={() => {}} mode="source" />);
    const sourceView = screen.getByTestId("amarantha-source-view");
    expect(sourceView.textContent).toBe("# hi");
    expect(screen.queryByTestId("amarantha-rich-editor")).toBeNull();
  });
});
