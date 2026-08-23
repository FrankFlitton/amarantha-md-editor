import type { DocumentUri, LoadedDocument } from "./types";

export function detectLineEnding(text: string): "lf" | "crlf" {
  const firstNewline = text.indexOf("\n");
  if (firstNewline > 0 && text[firstNewline - 1] === "\r") return "crlf";
  return "lf";
}

// Mirrors micromark-extension-frontmatter's own "yaml" fence rule: a `---`
// line at the very start of the document, closed by a lone `---` line — so
// this check never disagrees with what the editor actually parses as
// frontmatter.
const FRONTMATTER_BLOCK_RE = /^---\r?\n(?:.*\r?\n)*?---(?:\r?\n|$)/;

export function hasFrontmatterBlock(text: string): boolean {
  return FRONTMATTER_BLOCK_RE.test(text);
}

/**
 * Placeholder revision fingerprint (DJB2 hash of the text). This is NOT a
 * real conflict-detection mechanism yet — it exists so LoadedDocument.revision
 * has a value to thread through EditorHost.writeDocument's baseRevision.
 * A future reconciliation feature (RFC Milestone 4) should replace this.
 */
export function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function toLoadedDocument(uri: DocumentUri, text: string): LoadedDocument {
  return {
    uri,
    text,
    revision: hashText(text),
    lineEnding: detectLineEnding(text),
  };
}
