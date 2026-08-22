import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import type { FontPreference, FontSlot, ProseSize, ThemeFamily, ThemeModePreference } from "@amarantha/core";
import { CURATED_FONTS, PROSE_SIZES, THEME_FAMILIES } from "@amarantha/theme";

export type EditorMode = "rich" | "source";

export interface NativeMenuState {
  editorMode: EditorMode;
  familyPreference: ThemeFamily | undefined;
  modePreference: ThemeModePreference;
  sizePreference: ProseSize;
  sansFont: FontPreference;
  monoFont: FontPreference;
}

export interface NativeMenuActions {
  onOpen(): void;
  onSave(): void;
  onSetEditorMode(mode: EditorMode): void;
  onSetFamily(family: ThemeFamily | undefined): void;
  onSetModePreference(pref: ThemeModePreference): void;
  onSetSize(size: ProseSize): void;
  onSetFont(slot: FontSlot, pref: FontPreference): void;
  onPromptCustomFont(slot: FontSlot): void;
  onPromptSystemFont(slot: FontSlot): void;
}

export interface NativeMenuHandle {
  sync(state: NativeMenuState): Promise<void>;
}

const MODE_OPTIONS: { value: ThemeModePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

async function buildFontSubmenu(
  slot: FontSlot,
  label: string,
  actions: NativeMenuActions
): Promise<{ submenu: Submenu; items: Map<string, CheckMenuItem> }> {
  const items = new Map<string, CheckMenuItem>();

  const bundled = await CheckMenuItem.new({
    text: "Geist (default)",
    checked: true,
    action: () => actions.onSetFont(slot, { kind: "bundled" }),
  });
  items.set("bundled", bundled);

  const curatedItems: CheckMenuItem[] = [];
  for (const font of CURATED_FONTS.filter((f) => f.slot === slot)) {
    const item = await CheckMenuItem.new({
      text: font.label,
      checked: false,
      action: () => actions.onSetFont(slot, { kind: "fontsource", fontsourceId: font.id }),
    });
    items.set(`curated:${font.id}`, item);
    curatedItems.push(item);
  }

  const customItem = await MenuItem.new({
    text: "Custom Fontsource ID…",
    action: () => actions.onPromptCustomFont(slot),
  });
  const systemItem = await MenuItem.new({
    text: "System Font…",
    action: () => actions.onPromptSystemFont(slot),
  });
  const separator = await PredefinedMenuItem.new({ item: "Separator" });

  const submenu = await Submenu.new({
    text: label,
    items: [bundled, ...curatedItems, separator, customItem, systemItem],
  });

  return { submenu, items };
}

function fontCheckKey(pref: FontPreference): string | undefined {
  if (pref.kind === "bundled") return "bundled";
  if (pref.kind === "fontsource" && pref.fontsourceId) return `curated:${pref.fontsourceId}`;
  return undefined;
}

async function syncFontChecks(items: Map<string, CheckMenuItem>, pref: FontPreference): Promise<void> {
  const activeKey = fontCheckKey(pref);
  await Promise.all([...items].map(([key, item]) => item.setChecked(key === activeKey)));
}

/**
 * Builds the app's entire native macOS menu bar (this app has no in-window
 * HTML chrome at all — everything lives here) and sets it as the app menu.
 * `actions` should be a stable object whose methods forward to the latest
 * React state/handlers via a ref, since the menu (and its callbacks) are
 * created once and otherwise would close over stale state.
 */
export async function installNativeMenu(actions: NativeMenuActions): Promise<NativeMenuHandle> {
  const richItem = await CheckMenuItem.new({
    text: "Rich Text",
    checked: true,
    action: () => actions.onSetEditorMode("rich"),
  });
  const sourceItem = await CheckMenuItem.new({
    text: "Markdown Source",
    accelerator: "CmdOrCtrl+Shift+M",
    checked: false,
    action: () => actions.onSetEditorMode("source"),
  });

  const familyItems = new Map<string, CheckMenuItem>();
  const defaultFamilyItem = await CheckMenuItem.new({
    text: "Repo Default",
    checked: true,
    action: () => actions.onSetFamily(undefined),
  });
  familyItems.set("", defaultFamilyItem);
  const familyMenuItems: CheckMenuItem[] = [defaultFamilyItem];
  for (const { family, label } of THEME_FAMILIES) {
    const item = await CheckMenuItem.new({
      text: label,
      checked: false,
      action: () => actions.onSetFamily(family),
    });
    familyItems.set(family, item);
    familyMenuItems.push(item);
  }
  const familySeparator = await PredefinedMenuItem.new({ item: "Separator" });
  const paletteSubmenu = await Submenu.new({
    text: "Palette",
    items: [defaultFamilyItem, familySeparator, ...familyMenuItems.slice(1)],
  });

  const modeItems = new Map<ThemeModePreference, CheckMenuItem>();
  for (const { value, label } of MODE_OPTIONS) {
    const item = await CheckMenuItem.new({
      text: label,
      checked: value === "system",
      action: () => actions.onSetModePreference(value),
    });
    modeItems.set(value, item);
  }
  const appearanceSubmenu = await Submenu.new({ text: "Appearance", items: [...modeItems.values()] });

  const sizeItems = new Map<ProseSize, CheckMenuItem>();
  for (const { size, label } of PROSE_SIZES) {
    const item = await CheckMenuItem.new({
      text: label,
      checked: size === "base",
      action: () => actions.onSetSize(size),
    });
    sizeItems.set(size, item);
  }
  const sizeSubmenu = await Submenu.new({ text: "Text Size", items: [...sizeItems.values()] });

  const sansFont = await buildFontSubmenu("sans", "Body", actions);
  const monoFont = await buildFontSubmenu("mono", "Code", actions);
  const fontSubmenu = await Submenu.new({ text: "Font", items: [sansFont.submenu, monoFont.submenu] });

  const viewSubmenu = await Submenu.new({
    text: "View",
    items: [
      richItem,
      sourceItem,
      await PredefinedMenuItem.new({ item: "Separator" }),
      paletteSubmenu,
      appearanceSubmenu,
      sizeSubmenu,
      fontSubmenu,
    ],
  });

  const openItem = await MenuItem.new({ text: "Open…", accelerator: "CmdOrCtrl+O", action: () => actions.onOpen() });
  const saveItem = await MenuItem.new({ text: "Save", accelerator: "CmdOrCtrl+S", action: () => actions.onSave() });
  const fileSubmenu = await Submenu.new({
    text: "File",
    items: [openItem, saveItem, await PredefinedMenuItem.new({ item: "Separator" }), await PredefinedMenuItem.new({ item: "CloseWindow" })],
  });

  const editSubmenu = await Submenu.new({
    text: "Edit",
    items: [
      await PredefinedMenuItem.new({ item: "Undo" }),
      await PredefinedMenuItem.new({ item: "Redo" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Cut" }),
      await PredefinedMenuItem.new({ item: "Copy" }),
      await PredefinedMenuItem.new({ item: "Paste" }),
      await PredefinedMenuItem.new({ item: "SelectAll" }),
    ],
  });

  const appSubmenu = await Submenu.new({
    text: "Amarantha",
    items: [
      await PredefinedMenuItem.new({ item: { About: null } }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Services" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Hide" }),
      await PredefinedMenuItem.new({ item: "HideOthers" }),
      await PredefinedMenuItem.new({ item: "ShowAll" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Quit" }),
    ],
  });

  const windowSubmenu = await Submenu.new({
    text: "Window",
    items: [await PredefinedMenuItem.new({ item: "Minimize" }), await PredefinedMenuItem.new({ item: "Fullscreen" })],
  });

  const menu = await Menu.new({ items: [appSubmenu, fileSubmenu, editSubmenu, viewSubmenu, windowSubmenu] });
  await menu.setAsAppMenu();

  return {
    async sync(state) {
      await Promise.all([
        richItem.setChecked(state.editorMode === "rich"),
        sourceItem.setChecked(state.editorMode === "source"),
        ...[...familyItems].map(([key, item]) => item.setChecked((state.familyPreference ?? "") === key)),
        ...[...modeItems].map(([value, item]) => item.setChecked(state.modePreference === value)),
        ...[...sizeItems].map(([size, item]) => item.setChecked(state.sizePreference === size)),
        syncFontChecks(sansFont.items, state.sansFont),
        syncFontChecks(monoFont.items, state.monoFont),
      ]);
    },
  };
}
