import { act, createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { reconcileMarkdown } from "@amarantha/core";
import { AmaranthaEditor } from "./AmaranthaEditor";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import fixture from "./__fixtures__/simple.md?raw";

/**
 * MDXEditor's own Lexical-based import/export does NOT round-trip
 * byte-identically on its own — mdast (which its serializer is built on)
 * never records stylistic choices like a list's bullet character, so even
 * loading this fixture and immediately re-serializing it with no edit at
 * all flips `-` bullets to `*` and `*italic*` to `_italic_`. That gap is
 * exactly what @amarantha/core's `reconcileMarkdown` closes (RFC Milestone
 * 1): it diffs MDXEditor's fresh output against the original source at the
 * top-level-block granularity and keeps the original bytes for anything
 * that didn't actually change. These tests exercise the real MDXEditor
 * pipeline (not a hand-written stand-in for its output) to prove that gap
 * is actually closed, not just that reconcileMarkdown's own unit tests pass.
 */
describe("AmaranthaEditor round-trip, reconciled against the original source", () => {
  it("round-trips an untouched fixture byte-identically once reconciled", () => {
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={fixture} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    const rawOutput = editorRef.current?.getMarkdown() ?? "";
    // Confirms the gap this test suite exists to close is real, not stale
    // documentation — MDXEditor's own output alone is NOT byte-identical.
    expect(rawOutput.trim()).not.toBe(fixture.trim());

    const reconciled = reconcileMarkdown(fixture, rawOutput);
    expect(reconciled).toBe(fixture);
  });

  it("a local edit through the real editor changes only the edited region; untouched siblings keep their original bytes", async () => {
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={fixture} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    const edited = fixture.replace(
      "This is a paragraph with **bold** and *italic* text, plus a [link](https://example.com).",
      "This is a paragraph with **bold** and *italic* text, plus a [link](https://example.com), extended."
    );
    await act(async () => {
      editorRef.current?.setMarkdown(edited);
    });

    const rawOutput = editorRef.current?.getMarkdown() ?? "";
    const reconciled = reconcileMarkdown(fixture, rawOutput);

    expect(reconciled).toContain("extended.");
    // The list was never touched by this edit — it must keep its original
    // `-` bullets, not whatever MDXEditor's serializer defaults to.
    expect(reconciled).toContain("- one\n- two\n- three");
  });
});
