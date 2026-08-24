import * as vscode from "vscode";

function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

/**
 * Builds the webview's HTML shell. Script/style paths are fixed filenames
 * (webview.js/webview.css — see vite.webview.config.ts's output config), not
 * hashed, so this doesn't need to read a build manifest. Everything the
 * webview loads goes through asWebviewUri, and the CSP nonce is the only
 * thing that lets our bundled script execute at all.
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distUri = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "webview.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "webview.css"));
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
  <link rel="stylesheet" href="${styleUri}" />
  <title>Amarantha</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${cspNonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
