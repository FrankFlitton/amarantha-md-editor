import * as fs from "node:fs";
import * as vscode from "vscode";

function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

// Matches vite.webview.config.ts's rollupOptions.input, expressed as the
// manifest key Vite records it under (the input path relative to that
// config's root, i.e. packages/vscode/ — confirmed against a real build's
// .vite/manifest.json, not assumed).
const ENTRY_KEY = "src/webview/main.tsx";

interface ManifestEntry {
  file: string;
  css?: string[];
}

/**
 * Builds the webview's HTML shell. Script/style paths are read from Vite's
 * build manifest (dist/webview/.vite/manifest.json — build.manifest: true
 * in vite.webview.config.ts) rather than assumed fixed filenames: an
 * earlier version hardcoded "webview.js"/"webview.css", which broke as soon
 * as a second CSS asset existed (the curated fonts each add their own,
 * loaded via separate dynamic import() calls) — Rollup can't reuse one
 * filename for multiple distinct assets, so only the first of several
 * same-named outputs was ever actually linked. The manifest is the correct,
 * standard way to find a build's real output filenames. Only the entry's
 * *synchronously* needed script/CSS (the main bundle + its top-level
 * tailwind/theme/vscode-adapter styles) are linked here — Vite's own
 * runtime handles loading each curated font's separately-chunked CSS
 * on demand, injecting its own <link> when that font's dynamic import()
 * actually runs; nothing here needs to preemptively reference those.
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distUri = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  const manifestPath = vscode.Uri.joinPath(distUri, ".vite", "manifest.json").fsPath;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, ManifestEntry>;
  const entry = manifest[ENTRY_KEY];
  if (!entry) {
    throw new Error(`getHtmlForWebview: no "${ENTRY_KEY}" entry in ${manifestPath} — was the webview built?`);
  }

  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, entry.file));
  const styleUris = (entry.css ?? []).map((cssFile) => webview.asWebviewUri(vscode.Uri.joinPath(distUri, cssFile)));
  const cspNonce = nonce();

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} data: https:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${cspNonce}'; connect-src ${webview.cspSource};"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${styleUris.map((uri) => `<link rel="stylesheet" href="${uri}" />`).join("\n  ")}
  <title>Amarantha</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${cspNonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
