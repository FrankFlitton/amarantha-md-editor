import { describe, expect, it } from "vitest";
import { detectLineEnding, hashText, toLoadedDocument } from "./document";

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

describe("toLoadedDocument", () => {
  it("composes uri, text, revision, and lineEnding", () => {
    const doc = toLoadedDocument("file:///a.md", "# hi\r\n");
    expect(doc.uri).toBe("file:///a.md");
    expect(doc.text).toBe("# hi\r\n");
    expect(doc.lineEnding).toBe("crlf");
    expect(doc.revision).toBe(hashText("# hi\r\n"));
  });
});
