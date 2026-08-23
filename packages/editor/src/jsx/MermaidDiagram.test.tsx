import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "./MermaidDiagram";

const { renderMock, initializeMock } = vi.hoisted(() => ({
  renderMock: vi.fn(),
  initializeMock: vi.fn(),
}));

// Real mermaid rendering depends on browser-only APIs (getBBox, canvas
// measurement) jsdom does not implement — mocked here so this test exercises
// MermaidDiagram's own integration logic (debounce, success/error handling)
// deterministically, not mermaid's internals.
vi.mock("mermaid", () => ({
  default: {
    initialize: initializeMock,
    render: renderMock,
  },
}));

afterEach(() => {
  renderMock.mockReset();
  initializeMock.mockReset();
  vi.useRealTimers();
});

describe("MermaidDiagram", () => {
  it("renders the returned SVG into the canvas after the debounce settles", async () => {
    renderMock.mockResolvedValue({ svg: "<svg data-testid='fake-svg'></svg>" });

    render(<MermaidDiagram chart="graph TD; A-->B;" />);

    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("mermaid-canvas").innerHTML).toContain("fake-svg"));
    expect(screen.queryByTestId("mermaid-error")).toBeNull();
  });

  it("shows an error message, not a crash, for invalid diagram syntax", async () => {
    renderMock.mockRejectedValue(new Error("Parse error on line 1"));

    render(<MermaidDiagram chart="not a valid diagram" />);

    await waitFor(() => expect(screen.getByTestId("mermaid-error")).toBeTruthy());
    expect(screen.getByTestId("mermaid-error").textContent).toContain("Parse error");
  });

  it("shows an empty-state hint for an empty chart, without calling mermaid at all", () => {
    render(<MermaidDiagram chart="" />);
    expect(screen.getByTestId("mermaid-empty")).toBeTruthy();
    expect(screen.getByTestId("mermaid-canvas").innerHTML).toBe("");
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("debounces rapid chart changes down to a single render call", async () => {
    renderMock.mockResolvedValue({ svg: "<svg></svg>" });

    const { rerender } = render(<MermaidDiagram chart="graph TD; A" />);
    rerender(<MermaidDiagram chart="graph TD; A-" />);
    rerender(<MermaidDiagram chart="graph TD; A-->B;" />);

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));
    expect(renderMock).toHaveBeenCalledWith(expect.any(String), "graph TD; A-->B;");
  });
});
