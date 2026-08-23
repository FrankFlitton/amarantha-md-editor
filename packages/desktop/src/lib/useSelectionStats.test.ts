import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSelectionStats } from "./useSelectionStats";

function fireSelectionChange() {
  act(() => {
    document.dispatchEvent(new Event("selectionchange"));
  });
}

describe("useSelectionStats", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("returns null when nothing is selected", () => {
    const { result } = renderHook(() => useSelectionStats());
    expect(result.current).toBeNull();
  });

  it("reports character count and a token estimate for a contentEditable-style range selection", () => {
    const div = document.createElement("div");
    const text = "hello world, this is selected text";
    div.textContent = text;
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const { result } = renderHook(() => useSelectionStats());
    fireSelectionChange();

    expect(result.current?.characters).toBe(text.length);
    expect(result.current?.estimatedTokens).toBe(Math.round(text.length / 4));
  });

  it("reads a textarea's own selection range, not window.getSelection()", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "abcdefghij";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(2, 6);

    const { result } = renderHook(() => useSelectionStats());
    fireSelectionChange();

    expect(result.current?.characters).toBe(4);
  });

  it("returns null for a collapsed textarea selection", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "abcdef";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(2, 2);

    const { result } = renderHook(() => useSelectionStats());
    fireSelectionChange();

    expect(result.current).toBeNull();
  });

  it("clears back to null once the selection collapses", () => {
    const div = document.createElement("div");
    div.textContent = "hello world";
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const { result } = renderHook(() => useSelectionStats());
    fireSelectionChange();
    expect(result.current).not.toBeNull();

    selection?.removeAllRanges();
    fireSelectionChange();
    expect(result.current).toBeNull();
  });
});
