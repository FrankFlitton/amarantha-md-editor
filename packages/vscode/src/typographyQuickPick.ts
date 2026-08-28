import * as vscode from "vscode";
import type { FontPreference, FontSlot, ProseSize } from "@amarantha/core";
import { CURATED_FONTS, PROSE_SIZES } from "@amarantha/theme";
import { getActivePanel, type PanelEntry } from "./panelRegistry";

const SLOT_LABELS: Record<FontSlot, string> = { sans: "Body Font", heading: "Heading Font", mono: "Code Font" };

export async function runTypographyQuickPick(): Promise<void> {
  const entry = getActivePanel();
  // No active Amarantha panel to target — reachable via the Command Palette
  // even though its `when` clause normally excludes this case (e.g. a
  // keybinding or a programmatic executeCommand call).
  if (!entry) return;

  for (;;) {
    const sizeLabel = PROSE_SIZES.find((p) => p.size === entry.state.proseSize)?.label;
    const picked = await vscode.window.showQuickPick(
      [
        { label: "$(text-size) Text Size", description: sizeLabel, action: "size" as const },
        { label: "$(symbol-color) Body Font", description: fontLabel(entry.state.sansFont), action: "sans" as const },
        { label: "$(heading) Heading Font", description: fontLabel(entry.state.headingFont), action: "heading" as const },
        { label: "$(code) Code Font", description: fontLabel(entry.state.monoFont), action: "mono" as const },
      ],
      { title: "Amarantha Typography", placeHolder: "Select a setting to change" }
    );
    if (!picked) return; // Escape at the top level exits the loop entirely.

    if (picked.action === "size") await pickProseSize(entry);
    else await pickFont(entry, picked.action);
    // Escape from a sub-pick just falls through back to the top of the loop.
  }
}

function fontLabel(pref: FontPreference): string {
  if (pref.kind === "bundled") return "Default";
  if (pref.kind === "system") return `System: ${pref.systemFamily ?? "…"}`;
  return CURATED_FONTS.find((f) => f.id === pref.fontsourceId)?.label ?? pref.fontsourceId ?? "Custom";
}

async function pickProseSize(entry: PanelEntry): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    PROSE_SIZES.map((p) => ({ label: p.label, size: p.size })),
    { title: "Text Size", placeHolder: "Select a text size" }
  );
  if (picked) entry.post({ type: "applyProseSize", size: picked.size as ProseSize });
}

interface FontQuickPickItem extends vscode.QuickPickItem {
  kind2?: "default" | "curated" | "system" | "custom";
  fontId?: string;
}

async function pickFont(entry: PanelEntry, slot: FontSlot): Promise<void> {
  const current = { sans: entry.state.sansFont, heading: entry.state.headingFont, mono: entry.state.monoFont }[slot];
  const curated = CURATED_FONTS.filter((f) => f.slots.includes(slot));

  const items: FontQuickPickItem[] = [
    { label: "Default", kind2: "default" },
    ...curated.map((f) => ({ label: f.label, kind2: "curated" as const, fontId: f.id })),
    { label: "", kind: vscode.QuickPickItemKind.Separator },
    { label: "System Font…", kind2: "system" },
    { label: "Custom Fontsource ID…", kind2: "custom" },
  ];

  const picked = await vscode.window.showQuickPick(items, { title: SLOT_LABELS[slot], placeHolder: "Select a font" });
  if (!picked) return;

  if (picked.kind2 === "default") {
    entry.post({ type: "applyFont", slot, preference: { kind: "bundled" } });
  } else if (picked.kind2 === "curated") {
    entry.post({ type: "applyFont", slot, preference: { kind: "fontsource", fontsourceId: picked.fontId } });
  } else if (picked.kind2 === "system") {
    const family = await vscode.window.showInputBox({
      title: "System Font",
      prompt: "System font family",
      value: current.kind === "system" ? current.systemFamily : undefined,
    });
    if (family?.trim()) entry.post({ type: "applyFont", slot, preference: { kind: "system", systemFamily: family.trim() } });
  } else if (picked.kind2 === "custom") {
    const id = await vscode.window.showInputBox({
      title: "Custom Fontsource ID",
      prompt: "Fontsource package id",
      value: current.kind === "fontsource" ? current.fontsourceId : undefined,
    });
    if (id?.trim()) entry.post({ type: "applyFont", slot, preference: { kind: "fontsource", fontsourceId: id.trim() } });
  }
}
