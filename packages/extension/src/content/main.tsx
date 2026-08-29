import { createRoot } from "react-dom/client";
import { ContentApp } from "./App";
import { fetchRawText, isRawMarkdownDocument } from "./detect";
import { loadSettings } from "../lib/settings";

import themeCss from "@amarantha/theme/index.css?inline";
import mdxeditorCss from "@mdxeditor/editor/style.css?inline";
import tailwindCss from "./tailwind.css?inline";
import shellCss from "./content.css?inline";

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
  // reference --am-* variables), then mdxeditor's own component styles,
  // then Tailwind/typography utility classes, then this extension's own
  // chrome — same layering @amarantha/web gets for free from separate
  // ordered <link>/import statements, reproduced by hand here because
  // everything has to land in one shadow-root <style> tag instead.
  style.textContent = [themeCss, mdxeditorCss, tailwindCss, shellCss].join("\n");
  shadowRoot.appendChild(style);

  const mountPoint = document.createElement("div");
  mountPoint.style.height = "100%";
  shadowRoot.appendChild(mountPoint);

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  createRoot(mountPoint).render(
    <ContentApp markdown={markdown} settings={settings} sourceUrl={sourceUrl} prefersDark={prefersDark} />
  );
}

// Errors here would otherwise be a silent unhandled rejection — e.g. a
// failed re-fetch (see fetchRawText's own docstring) shouldn't leave the
// page stuck on Chrome's raw-text view with no indication anything ran.
run().catch((error: unknown) => {
  console.error("[amarantha] failed to render markdown", error);
});
