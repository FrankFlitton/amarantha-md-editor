import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { AmaranthaEditor } from "../AmaranthaEditor";

/**
 * The value/key fields are persistent contentEditable elements (no
 * input-swap) — editing in a test means: focus it, set its textContent
 * directly (jsdom has no real typing), then blur to commit, mirroring what
 * a real browser keystroke would leave behind.
 */
function typeInto(el: HTMLElement, text: string) {
  fireEvent.focus(el);
  el.textContent = text;
  fireEvent.blur(el);
}

describe("amaranthaFrontmatterPlugin + AmaranthaFrontmatterEditor integration", () => {
  it("renders every key/value pair directly, with no collapsed/click-to-expand step", () => {
    const markdown = '---\ntitle: "Draft proposal"\nstatus: review\n---\n\n# Heading\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    expect(screen.getByTestId("frontmatter-card")).toBeTruthy();
    expect(screen.getByTestId("frontmatter-key-title").textContent).toBe("title");
    expect(screen.getByTestId("frontmatter-value-title").textContent).toBe("Draft proposal");
    expect(screen.getByTestId("frontmatter-value-status").textContent).toBe("review");
  });

  it("each row is directly contentEditable — no separate display/edit element swap", () => {
    const markdown = "---\ntitle: Draft\n---\n\n# Heading\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    const value = screen.getByTestId("frontmatter-value-title");
    expect(value.getAttribute("contenteditable")).toBe("true");
    fireEvent.focus(value);
    // Same node before and after focus — nothing was unmounted/remounted.
    expect(screen.getByTestId("frontmatter-value-title")).toBe(value);
  });

  it("editing a value preserves untouched keys and comments in the source", () => {
    const markdown = ["---", 'title: "Draft proposal" # working title', "status: review", "---", "", "# Heading", ""].join(
      "\n"
    );
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    typeInto(screen.getByTestId("frontmatter-value-status"), "published");

    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain('title: "Draft proposal" # working title');
    expect(output).toContain("status: published");
    expect(output).toContain("# Heading");
  });

  it("editing a key renames it in place, preserving its value and position", () => {
    const markdown = "---\ntitle: Draft\nstatus: review\n---\n\n# Heading\n";
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    typeInto(screen.getByTestId("frontmatter-key-title"), "name");

    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain("name: Draft");
    expect(output).toContain("status: review");
    expect(output).not.toMatch(/^title:/m);
  });

  it("an array value renders as one plain text field per item, plus its own + to append", () => {
    const markdown = '---\ntags: ["a", "b"]\n---\n\n# Heading\n';
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    const item0 = screen.getByTestId("frontmatter-value-tags-0");
    const item1 = screen.getByTestId("frontmatter-value-tags-1");
    expect(item0.getAttribute("contenteditable")).toBe("true");
    expect(item0.textContent).toBe("a");
    expect(item1.textContent).toBe("b");
    // No single field ever holds the whole array's flow text.
    expect(screen.queryByTestId("frontmatter-value-tags")).toBeNull();

    typeInto(item1, "bee");
    let output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain("bee");
    expect(output).not.toMatch(/\bb\b/);

    fireEvent.click(screen.getByTestId("frontmatter-array-add-tags"));
    const newItem = screen.getByTestId("frontmatter-value-tags-2");
    typeInto(newItem, "c");

    output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain("a");
    expect(output).toContain("bee");
    expect(output).toContain("c");
  });

  it("clearing an array item's text removes it (splices it out) rather than leaving it blank", () => {
    const markdown = '---\ntags: ["a", "b", "c"]\n---\n\n# Heading\n';
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    typeInto(screen.getByTestId("frontmatter-value-tags-1"), "");

    expect(screen.getByTestId("frontmatter-value-tags-0").textContent).toBe("a");
    expect(screen.getByTestId("frontmatter-value-tags-1").textContent).toBe("c");
    expect(screen.queryByTestId("frontmatter-value-tags-2")).toBeNull();
  });

  it("typed values resolve to their real YAML type, not always a string", () => {
    const markdown = "---\ntitle: Draft\n---\n\n# Heading\n";
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    fireEvent.click(screen.getByTestId("frontmatter-add"));
    typeInto(screen.getByTestId("frontmatter-new-key"), "published");
    typeInto(screen.getByTestId("frontmatter-value-published"), "true");

    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toMatch(/published: true/);
    expect(output).not.toMatch(/published: "true"/);
  });

  it("the + button appends a new key/value pair", () => {
    const markdown = "---\ntitle: Draft\n---\n\n# Heading\n";
    const editorRef = createRef<MDXEditorMethods>();
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" editorRef={editorRef} />);

    fireEvent.click(screen.getByTestId("frontmatter-add"));
    typeInto(screen.getByTestId("frontmatter-new-key"), "status");

    expect(screen.getByTestId("frontmatter-key-status")).toBeTruthy();
    const output = editorRef.current?.getMarkdown() ?? "";
    expect(output).toContain("title: Draft");
    expect(output).toContain("status:");
  });

  it("blurring the new-row key without typing anything discards the ephemeral row", () => {
    const markdown = "---\ntitle: Draft\n---\n\n# Heading\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    fireEvent.click(screen.getByTestId("frontmatter-add"));
    const newKey = screen.getByTestId("frontmatter-new-key");
    fireEvent.focus(newKey);
    fireEvent.blur(newKey);

    expect(screen.queryByTestId("frontmatter-new-key")).toBeNull();
    expect(screen.getByTestId("frontmatter-add")).toBeTruthy();
  });

  it("falls back to a raw YAML textarea via the 'Edit as YAML' toggle", () => {
    const markdown = "---\ntitle: Draft\npublished: 2026-08-22\n---\n\n# Heading\n";
    render(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" />);

    fireEvent.click(screen.getByTestId("frontmatter-raw-toggle"));
    const raw = screen.getByTestId("frontmatter-raw") as HTMLTextAreaElement;
    expect(raw.value).toContain("published: 2026-08-22");
  });

  it("the hidden toggle suppresses rendering, and reappears when un-hidden, via a prop update (no remount)", () => {
    const markdown = "---\ntitle: Draft\n---\n\n# Heading\n";
    const { rerender } = render(
      <AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" frontmatterHidden={false} />
    );
    expect(screen.getByTestId("frontmatter-card")).toBeTruthy();

    rerender(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" frontmatterHidden={true} />);
    expect(screen.queryByTestId("frontmatter-card")).toBeNull();

    rerender(<AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" frontmatterHidden={false} />);
    expect(screen.getByTestId("frontmatter-card")).toBeTruthy();
  });

  it("renders nothing for a document with no frontmatter block", () => {
    render(<AmaranthaEditor value={"# Heading\nbody text\n"} onChange={() => {}} mode="rich" />);
    expect(screen.queryByTestId("frontmatter-card")).toBeNull();
  });
});
