import type { DocumentUri, LoadedDocument } from "./types";

export function detectLineEnding(text: string): "lf" | "crlf" {
  const firstNewline = text.indexOf("\n");
  if (firstNewline > 0 && text[firstNewline - 1] === "\r") return "crlf";
  return "lf";
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
