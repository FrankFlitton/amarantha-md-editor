import { createRoot } from "react-dom/client";
import { setMermaidLoader } from "@amarantha/editor";
import { ContentApp } from "./App";
import { fetchRawText, isRawMarkdownDocument } from "./detect";
import { loadSettings } from "../lib/settings";

import themeCss from "@amarantha/theme/index.css?inline";
import mdxeditorCss from "@mdxeditor/editor/style.css?inline";
// @amarantha/editor's own component CSS — none of this is re-exported through
// its package entry (they're plain side-effect `import "./x.css"` statements
// inside individual components), so web/vscode/desktop never import these
// explicitly either: their normal (non-lib) Vite builds auto-collect every
// CSS side-effect import reachable from the app and link it via a <style>/
// <link> Vite generates into their own index.html at build time. A content
// script has no HTML page for Vite to inject that into — `cssCodeSplit:
// false` in vite.content.config.ts instead dumps all of it into one
// `extension.css` file that nothing then loads (manifest.json's
// content_scripts has no matching "css" entry), so it silently never reaches
// the page at all. Pulled in by hand here for exactly that reason.
import editorToolbarCss from "../../../editor/src/toolbar/ui.module.css?inline";
import editorSourceViewCss from "../../../editor/src/SourceView.css?inline";
import editorInlineEditableTextCss from "../../../editor/src/InlineEditableText.css?inline";
import editorFrontmatterCss from "../../../editor/src/frontmatter/frontmatter.css?inline";
import editorJsxEditorCss from "../../../editor/src/jsx/jsx-editor.css?inline";
import editorMermaidDiagramCss from "../../../editor/src/jsx/mermaid-diagram.css?inline";
import tailwindCss from "./tailwind.css?inline";
import shellCss from "./content.css?inline";

// content.js never bundles mermaid (see vite.content.config.ts's `external`)
// — a plain `import("mermaid")` from this classic content script would
// resolve against the host page's origin and 404 anyway. This points it at
// the extension's own packaged chunk instead, fetched only if a document
// actually renders a Mermaid diagram. `@vite-ignore`: the specifier isn't a
// literal, so there's nothing for Vite to statically analyze or bundle here.
setMermaidLoader(() => import(/* @vite-ignore */ chrome.runtime.getURL("lazy/mermaid-chunk.js")));

async function run() {
  if (!isRawMarkdownDocument()) return;

  const settings = await loadSettings();
  if (!settings.enabled) return;

  const sourceUrl = location.href;
  const markdown = await fetchRawText(sourceUrl);

  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.height = "100vh";

  const filename = decodeURIComponent(location.pathname.split("/").pop() || "document.md");
  document.title = `${filename} — Amarantha`;

  const host = document.createElement("div");
  host.style.height = "100vh";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  // Order matters: theme tokens first (so mdxeditor/tailwind rules can
  // reference --am-* variables), then mdxeditor's own component styles, then
  // @amarantha/editor's own component styles (the vendored toolbar/select
  // fork, source view, inline-editable text, frontmatter, JSX/Mermaid
  // editors), then Tailwind/typography utility classes, then this
  // extension's own chrome — same layering @amarantha/web gets for free from
  // separate ordered <link>/import statements, reproduced by hand here
  // because everything has to land in one shadow-root <style> tag instead.
  style.textContent = [
    themeCss,
    mdxeditorCss,
    editorToolbarCss,
    editorSourceViewCss,
    editorInlineEditableTextCss,
    editorFrontmatterCss,
    editorJsxEditorCss,
    editorMermaidDiagramCss,
    tailwindCss,
    shellCss,
  ].join("\n");
  shadowRoot.appendChild(style);

  const mountPoint = document.createElement("div");
  mountPoint.style.height = "100%";
  shadowRoot.appendChild(mountPoint);

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  createRoot(mountPoint).render(
    <ContentApp
      markdown={markdown}
      filename={filename}
      settings={settings}
      sourceUrl={sourceUrl}
      prefersDark={prefersDark}
    />
  );
}

// Errors here would otherwise be a silent unhandled rejection — e.g. a
// failed re-fetch (see fetchRawText's own docstring) shouldn't leave the
// page stuck on Chrome's raw-text view with no indication anything ran.
run().catch((error: unknown) => {
  console.error("[amarantha] failed to render markdown", error);
});
