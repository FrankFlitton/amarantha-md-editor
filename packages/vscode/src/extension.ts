import * as vscode from "vscode";
import { AmaranthaEditorProvider } from "./AmaranthaEditorProvider";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(AmaranthaEditorProvider.register(context));
}

export function deactivate(): void {}
