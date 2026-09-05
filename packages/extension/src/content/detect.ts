/**
 * A URL ending in .md/.mdx/.markdown/.txt (manifest.json's content_scripts
 * matches) is not necessarily a raw text file — GitHub's own
 * `/blob/main/README.md` page (real HTML, syntax-highlighted UI) matches the
 * same URL shape. Only replace the page when Chrome is actually showing its
 * native "unstyled text" viewer for this document: either the server sent a
 * text/plain-ish content type, or (content type omitted/misreported) the
 * whole body is Chrome's single generated <pre> wrapper — the same signal
 * every raw-text-rendering extension relies on, since there is no other way
 * from a content script to distinguish "raw file" from "HTML page that
 * happens to have a matching path" without re-fetching (done separately, in
 * fetchRawText, once this check has already said yes). Extension-agnostic by
 * design: a .txt or .mdx file gets the exact same content-type/DOM check as
 * a .md one, so supporting another extension is purely a manifest.json edit.
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
 * as significant. Deliberately *not* `credentials: "include"`: this fetch
 * targets the exact URL the document is already at, so the default
 * "same-origin" mode already attaches cookies for a private raw file behind
 * a logged-in session — "include" adds nothing there but actively breaks the
 * far more common public case. A page served with a CSP `sandbox` directive
 * (raw.githubusercontent.com among them) gets an opaque ("null") origin,
 * which turns this same-URL fetch into a cross-origin one from the browser's
 * perspective; a credentialed cross-origin request can never accept the
 * wildcard `Access-Control-Allow-Origin: *` such hosts serve, so `"include"`
 * made every sandboxed page's fetch fail outright — that opaque origin can't
 * carry cookies either way, so nothing was gained by requesting them.
 *
 * `file:` is a separate, harder wall: the Fetch API's scheme allowlist
 * (Chrome's own error names it — "brave, chrome, chrome-extension,
 * chrome-untrusted, data, http, https, isolated-app") never includes `file`,
 * full stop. No manifest permission changes that — `host_permissions` and
 * "Allow access to file URLs" control whether a request is *allowed*, not
 * which schemes `fetch()` is spec'd to attempt at all. For `file:` this reads
 * the already-loaded document instead: Chrome's local text-file viewer is the
 * same generated single `<pre>` wrapper isRawMarkdownDocument checks for,
 * already holding the exact file bytes by the time this content script runs.
 * `.textContent`, not `.innerText`: textContent is a plain DOM-tree
 * serialization uninvolved with layout, so it doesn't inherit innerText's
 * whitespace-collapsing behavior — the same fidelity concern that ruled out
 * reading the DOM for the http(s) path above, without the same cost here.
 */
export async function fetchRawText(url: string): Promise<string> {
  if (url.startsWith("file:")) {
    return document.body.firstElementChild?.textContent ?? "";
  }
  const response = await fetch(url);
  return response.text();
}
