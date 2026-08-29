/**
 * A URL ending in .md is not necessarily a raw markdown file — GitHub's own
 * `/blob/main/README.md` page (real HTML, syntax-highlighted UI) matches the
 * same URL shape. Only replace the page when Chrome is actually showing its
 * native "unstyled text" viewer for this document: either the server sent a
 * text/plain-ish content type, or (content type omitted/misreported) the
 * whole body is Chrome's single generated <pre> wrapper — the same signal
 * every raw-text-rendering extension relies on, since there is no other way
 * from a content script to distinguish "raw file" from "HTML page that
 * happens to have a .md path" without re-fetching (done separately, in
 * fetchRawText, once this check has already said yes).
 */
export function isRawMarkdownDocument(doc: Document = document): boolean {
  const contentType = doc.contentType ?? "";
  if (/^text\/(plain|markdown|x-markdown)\b/i.test(contentType)) return true;

  const body = doc.body;
  if (!body) return false;
  const onlyChild = body.children.length === 1 ? body.firstElementChild : null;
  return onlyChild?.tagName === "PRE" && onlyChild.children.length === 0;
}

/**
 * Re-fetches the same URL rather than reading the DOM: `.innerText` on
 * Chrome's generated <pre> collapses some whitespace and line-ending detail
 * that reconcileMarkdown-adjacent tooling elsewhere in this codebase treats
 * as significant. `credentials: "include"` matters for private raw files
 * (e.g. a GitHub raw URL behind a logged-in session) — the original
 * navigation already had the browser's cookies attached, so the re-fetch
 * should too.
 */
export async function fetchRawText(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "include" });
  return response.text();
}
