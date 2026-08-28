import * as vscode from "vscode";
import type { FontPreference, ProseSize } from "@amarantha/core";
import type { EditorMode, HostMessage } from "./protocol";

export interface AmaranthaWebviewState {
  mode: EditorMode;
  frontmatterHidden: boolean;
  proseSize: ProseSize;
  sansFont: FontPreference;
  headingFont: FontPreference;
  monoFont: FontPreference;
}

export interface PanelEntry {
  post: (message: HostMessage) => void;
  state: AmaranthaWebviewState;
}

// Keyed by the WebviewPanel instance itself, not by document URI — the same
// .md file can be open in two split panes at once (VS Code's "Split Editor"
// resolves a second, independent resolveCustomTextEditor call for the same
// uri), and a uri-keyed map would let the second registration clobber the
// first's tracked state.
const panels = new Map<vscode.WebviewPanel, PanelEntry>();
let active: vscode.WebviewPanel | undefined;

export function registerPanel(panel: vscode.WebviewPanel, entry: PanelEntry): void {
  panels.set(panel, entry);
}

export function unregisterPanel(panel: vscode.WebviewPanel): void {
  panels.delete(panel);
  if (active === panel) setActivePanel(panel, false);
}

export function updatePanelState(panel: vscode.WebviewPanel, state: AmaranthaWebviewState): void {
  const entry = panels.get(panel);
  if (!entry) return;
  entry.state = state;
  if (active === panel) syncContextKeys(state);
}

export function setActivePanel(panel: vscode.WebviewPanel, isActive: boolean): void {
  if (isActive) {
    active = panel;
    syncContextKeys(panels.get(panel)?.state);
  } else if (active === panel) {
    // If isActive is false but `active` no longer points at this panel,
    // another panel's onDidChangeViewState already took over — ignore, to
    // stay safe against event-ordering races between two panels.
    active = undefined;
    syncContextKeys(undefined);
  }
}

export function getActivePanel(): PanelEntry | undefined {
  return active ? panels.get(active) : undefined;
}

function syncContextKeys(state: AmaranthaWebviewState | undefined): void {
  void vscode.commands.executeCommand("setContext", "amarantha.mode", state?.mode);
  void vscode.commands.executeCommand("setContext", "amarantha.frontmatterHidden", state?.frontmatterHidden);
}
