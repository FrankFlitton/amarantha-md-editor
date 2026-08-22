import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmaranthaEditor } from "./AmaranthaEditor";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import fixture from "./__fixtures__/simple.md?raw";

/**
 * This is the one fixture we've hand-verified MDXEditor round-trips
 * byte-identically. It is NOT a general fidelity guarantee — the real
 * source-preserving/minimal-diff engine is future work (RFC Milestone 1,
 * see docs/decisions.md). If this ever fails, the failure diff below is
 * the actual signal to record, not something to weaken the assertion for.
 */
describe("AmaranthaEditor round-trip smoke test", () => {
  it("round-trips the trivial fixture byte-identically", () => {
    const editorRef = createRef<MDXEditorMethods>();
    render(
      <AmaranthaEditor value={fixture} onChange={() => {}} mode="rich" editorRef={editorRef} />
    );

    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output.trim()).toBe(fixture.trim());
  });
});
