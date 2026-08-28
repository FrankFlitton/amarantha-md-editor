import * as vscode from "vscode";
import { AmaranthaEditorProvider } from "./AmaranthaEditorProvider";
import { getActivePanel } from "./panelRegistry";
import { runTypographyQuickPick } from "./typographyQuickPick";
import type { HostMessage } from "./protocol";

// Commands only ever post a change to the active webview — they never touch
// context keys directly. The webview applies it locally and reports back via
// "stateChanged" (see AmaranthaEditorProvider), which is what actually flips
// the editor/title icon. Keeps webview state single-sourced.
function postToActive(message: HostMessage): void {
  getActivePanel()?.post(message);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(AmaranthaEditorProvider.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand("amarantha.showSource", () => postToActive({ type: "applyMode", mode: "source" })),
    vscode.commands.registerCommand("amarantha.showRich", () => postToActive({ type: "applyMode", mode: "rich" })),
    vscode.commands.registerCommand("amarantha.hideFrontmatter", () => postToActive({ type: "applyFrontmatterHidden", hidden: true })),
    vscode.commands.registerCommand("amarantha.showFrontmatter", () => postToActive({ type: "applyFrontmatterHidden", hidden: false })),
    vscode.commands.registerCommand("amarantha.typography", () => runTypographyQuickPick())
  );
}

export function deactivate(): void {}
