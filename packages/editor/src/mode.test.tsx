import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmaranthaEditor } from "./AmaranthaEditor";

describe("AmaranthaEditor mode switching", () => {
  it("renders the rich MDXEditor surface in rich mode", () => {
    render(<AmaranthaEditor value="# hi" onChange={() => {}} mode="rich" />);
    expect(screen.getByTestId("amarantha-rich-editor")).toBeTruthy();
    expect(screen.queryByTestId("amarantha-source-view")).toBeNull();
  });

  it("renders the plain textarea in source mode", () => {
    render(<AmaranthaEditor value="# hi" onChange={() => {}} mode="source" />);
    const sourceView = screen.getByTestId("amarantha-source-view") as HTMLTextAreaElement;
    expect(sourceView.value).toBe("# hi");
    expect(screen.queryByTestId("amarantha-rich-editor")).toBeNull();
  });
});
