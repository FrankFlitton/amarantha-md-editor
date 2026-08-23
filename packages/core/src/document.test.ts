import { describe, expect, it } from "vitest";
import { detectLineEnding, hashText, hasFrontmatterBlock, toLoadedDocument } from "./document";

describe("detectLineEnding", () => {
  it("detects LF", () => {
    expect(detectLineEnding("a\nb\nc")).toBe("lf");
  });

  it("detects CRLF", () => {
    expect(detectLineEnding("a\r\nb\r\nc")).toBe("crlf");
  });

  it("defaults to LF when there is no newline", () => {
    expect(detectLineEnding("no newline here")).toBe("lf");
  });
});

describe("hashText", () => {
  it("is deterministic", () => {
    expect(hashText("hello world")).toBe(hashText("hello world"));
  });

  it("differs for distinct inputs", () => {
    expect(hashText("hello")).not.toBe(hashText("world"));
  });
});

describe("hasFrontmatterBlock", () => {
  it("detects a well-formed leading frontmatter block", () => {
    expect(hasFrontmatterBlock("---\ntitle: Draft\n---\n# Heading")).toBe(true);
  });

  it("detects an empty frontmatter block", () => {
    expect(hasFrontmatterBlock("---\n---\n")).toBe(true);
  });

  it("handles CRLF line endings", () => {
    expect(hasFrontmatterBlock("---\r\ntitle: Draft\r\n---\r\n# Heading")).toBe(true);
  });

  it("is false when there is no frontmatter", () => {
    expect(hasFrontmatterBlock("# Heading\nbody text")).toBe(false);
  });

  it("is false when the fence isn't at the very start of the document", () => {
    expect(hasFrontmatterBlock("# Heading\n---\ntitle: Draft\n---\n")).toBe(false);
  });

  it("is false for an unclosed fence", () => {
    expect(hasFrontmatterBlock("---\ntitle: Draft\n# Heading")).toBe(false);
  });
});

describe("toLoadedDocument", () => {
  it("composes uri, text, revision, and lineEnding", () => {
    const doc = toLoadedDocument("file:///a.md", "# hi\r\n");
    expect(doc.uri).toBe("file:///a.md");
    expect(doc.text).toBe("# hi\r\n");
    expect(doc.lineEnding).toBe("crlf");
    expect(doc.revision).toBe(hashText("# hi\r\n"));
  });
});
