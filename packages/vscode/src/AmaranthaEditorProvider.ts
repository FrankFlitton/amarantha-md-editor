import * as path from "node:path";
import * as vscode from "vscode";
import { DEFAULT_FONT_PREFERENCE, reconcileMarkdown } from "@amarantha/core";
import { getHtmlForWebview } from "./getHtmlForWebview";
import { resolveWorkspaceConfig } from "./workspaceConfig";
import { saveUploadedImage, resolveImagePreviewSrc } from "./imageHost";
import { resolveFontsourceFont } from "./fontHost";
import { registerPanel, unregisterPanel, updatePanelState, setActivePanel, type AmaranthaWebviewState } from "./panelRegistry";
import type { HostMessage, WebviewMessage } from "./protocol";

// Must match WebviewApp.tsx's own initial useState defaults — this seeds the
// panel registry (and thus the editor/title icons' context keys) before the
// webview's first real "stateChanged" report arrives.
const DEFAULT_WEBVIEW_STATE: AmaranthaWebviewState = {
  mode: "rich",
  frontmatterHidden: false,
  proseSize: "base",
  sansFont: DEFAULT_FONT_PREFERENCE,
  headingFont: DEFAULT_FONT_PREFERENCE,
  monoFont: DEFAULT_FONT_PREFERENCE,
};

/**
 * VS Code CustomTextEditorProvider for .md/.mdx files. The vscode.TextDocument
 * this class is handed is the sole source of truth — no separate read/write/
 * watch/revision/conflict model is layered on top of it (unlike
 * @amarantha/editor's createDocumentStore, which desktopHost.ts uses: that
 * store's disk-authoritative lifecycle is the wrong shape here, since VS Code
 * itself already owns dirty-state, undo/redo, and Ctrl/Cmd+S for this
 * document — see docs/decisions.md and the plan this was built from).
 */
export class AmaranthaEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "amarantha.editor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      AmaranthaEditorProvider.viewType,
      new AmaranthaEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const docDir = vscode.Uri.file(path.dirname(document.uri.fsPath));
    // Resolved once up front (not lazily on "ready"): localResourceRoots
    // below needs imagePrefixDir before the webview is even created, since
    // a repo's imagePrefix commonly points *outside* the document's own
    // directory (e.g. content/ vs. src/public/ in a Jamstack repo) — without
    // widening the resource roots, asWebviewUri would produce a URI VS
    // Code's webview resource guard then silently refuses to load.
    const workspaceConfig = await resolveWorkspaceConfig(document.uri.fsPath);

    const localResourceRoots = [
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
      docDir,
      this.context.globalStorageUri,
    ];
    if (workspaceConfig.imagePrefixDir) {
      localResourceRoots.push(vscode.Uri.file(workspaceConfig.imagePrefixDir));
    }

    webviewPanel.webview.options = { enableScripts: true, localResourceRoots };
    webviewPanel.webview.html = getHtmlForWebview(webviewPanel.webview, this.context.extensionUri);

    // Tracks the text this provider itself last wrote via applyEdit, so the
    // onDidChangeTextDocument listener below can tell "the webview's own
    // edit echoing back" apart from a genuinely external change (undo,
    // another panel on the same document, a disk/git change) — only the
    // latter should ever cause the webview to reseed/remount, or the user
    // would lose their cursor position on every keystroke.
    let lastKnownWebviewText = document.getText();

    const post = (message: HostMessage) => void webviewPanel.webview.postMessage(message);

    registerPanel(webviewPanel, { post, state: DEFAULT_WEBVIEW_STATE });
    // onDidChangeViewState only fires on *subsequent* activation changes, not
    // for the initial reveal — without this explicit check, a panel opened
    // already-active would never sync its context keys until the user
    // switched away to another tab and back.
    if (webviewPanel.active) setActivePanel(webviewPanel, true);

    const viewStateSub = webviewPanel.onDidChangeViewState((event) => setActivePanel(webviewPanel, event.webviewPanel.active));

    const sendInit = () => {
      post({
        type: "init",
        uri: document.uri.toString(),
        text: document.getText(),
        componentDefinitions: workspaceConfig.componentDefinitions,
        frontmatterFields: workspaceConfig.frontmatterFields,
      });
    };

    const changeSub = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) return;
      const text = event.document.getText();
      if (text === lastKnownWebviewText) return; // our own edit, echoed back — not external
      lastKnownWebviewText = text;
      post({ type: "externalUpdate", text });
    });

    const messageSub = webviewPanel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.type) {
        case "ready":
          sendInit();
          return;

        case "edit": {
          const reconciled = reconcileMarkdown(document.getText(), message.text);
          if (reconciled === document.getText()) return;
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
          edit.replace(document.uri, fullRange, reconciled);
          // Set before applying: applyEdit's resulting onDidChangeTextDocument
          // can fire before this awaits, and must see the up-to-date value to
          // correctly recognize itself as a self-write.
          lastKnownWebviewText = reconciled;
          await vscode.workspace.applyEdit(edit);
          return;
        }

        case "requestImageUpload": {
          try {
            const src = await saveUploadedImage(document.uri.fsPath, message.name, message.dataBase64);
            post({ type: "imageUploadResolved", requestId: message.requestId, src });
          } catch (error) {
            post({ type: "requestFailed", requestId: message.requestId, error: errorMessage(error) });
          }
          return;
        }

        case "requestImagePreview": {
          try {
            const src = await resolveImagePreviewSrc(document.uri.fsPath, message.src, webviewPanel.webview, {
              imagePrefix: workspaceConfig.imagePrefix,
              imagePrefixDir: workspaceConfig.imagePrefixDir,
            });
            post({ type: "imagePreviewResolved", requestId: message.requestId, src });
          } catch (error) {
            post({ type: "requestFailed", requestId: message.requestId, error: errorMessage(error) });
          }
          return;
        }

        case "requestFont": {
          try {
            if (message.preference.kind !== "fontsource" || !message.preference.fontsourceId) {
              throw new Error("requestFont is only sent for fontsource preferences");
            }
            const { family, fontFaceCss } = await resolveFontsourceFont(
              this.context.globalStorageUri.fsPath,
              message.preference.fontsourceId,
              webviewPanel.webview
            );
            post({ type: "fontResolved", requestId: message.requestId, family, fontFaceCss });
          } catch (error) {
            post({ type: "requestFailed", requestId: message.requestId, error: errorMessage(error) });
          }
          return;
        }

        case "stateChanged":
          updatePanelState(webviewPanel, {
            mode: message.mode,
            frontmatterHidden: message.frontmatterHidden,
            proseSize: message.proseSize,
            sansFont: message.sansFont,
            headingFont: message.headingFont,
            monoFont: message.monoFont,
          });
          return;
      }
    });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      messageSub.dispose();
      viewStateSub.dispose();
      unregisterPanel(webviewPanel);
    });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
