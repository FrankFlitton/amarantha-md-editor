import { create } from "zustand";
import type { EditorMode } from "@amarantha/editor";
import type { FontPreference, FontSlot, ProseSize, ThemeFamily, ThemeModePreference } from "@amarantha/core";
import { DEFAULT_FONT_PREFERENCE } from "@amarantha/core";
import { readPreference, writePreference } from "./lib/preferences";
import type { FontPromptRequest } from "./FontPromptModal";

/**
 * Desktop-only app chrome: theme/font/size preferences (persisted to
 * localStorage under the same per-key format `usePersistentState` used, so
 * existing local preference data reads unchanged) and transient UI state
 * (current rich/source mode, the one still-HTML font-prompt modal). None of
 * this generalizes to a future VS Code host — its equivalent is its own
 * settings system and command palette, not this app's native menu/localStorage
 * — so unlike the document store (@amarantha/editor's createDocumentStore),
 * this one stays a plain, desktop-specific store, not a portable factory.
 */
export interface AppState {
  modePreference: ThemeModePreference;
  familyPreference: ThemeFamily | undefined;
  sizePreference: ProseSize;
  sansFont: FontPreference;
  headingFont: FontPreference;
  monoFont: FontPreference;

  mode: EditorMode;
  fontPromptRequest: FontPromptRequest | null;

  setModePreference(pref: ThemeModePreference): void;
  setFamilyPreference(family: ThemeFamily | undefined): void;
  setSizePreference(size: ProseSize): void;
  setFont(slot: FontSlot, pref: FontPreference): void;
  setMode(mode: EditorMode): void;
  requestFontPrompt(slot: FontSlot, kind: FontPromptRequest["kind"], initialValue: string): void;
  closeFontPrompt(): void;
}

const KEYS = {
  mode: "amarantha:mode",
  family: "amarantha:family",
  size: "amarantha:size",
  sansFont: "amarantha:font-sans",
  headingFont: "amarantha:font-heading",
  monoFont: "amarantha:font-mono",
} as const;

export function fontForSlot(state: Pick<AppState, "sansFont" | "headingFont" | "monoFont">, slot: FontSlot): FontPreference {
  return slot === "sans" ? state.sansFont : slot === "heading" ? state.headingFont : state.monoFont;
}

export const useAppStore = create<AppState>()((set) => ({
  modePreference: readPreference<ThemeModePreference>(KEYS.mode, "system"),
  familyPreference: readPreference<ThemeFamily | undefined>(KEYS.family, undefined),
  sizePreference: readPreference<ProseSize>(KEYS.size, "base"),
  sansFont: readPreference<FontPreference>(KEYS.sansFont, DEFAULT_FONT_PREFERENCE),
  headingFont: readPreference<FontPreference>(KEYS.headingFont, DEFAULT_FONT_PREFERENCE),
  monoFont: readPreference<FontPreference>(KEYS.monoFont, DEFAULT_FONT_PREFERENCE),

  mode: "rich",
  fontPromptRequest: null,

  setModePreference(pref) {
    writePreference(KEYS.mode, pref);
    set({ modePreference: pref });
  },
  setFamilyPreference(family) {
    writePreference(KEYS.family, family);
    set({ familyPreference: family });
  },
  setSizePreference(size) {
    writePreference(KEYS.size, size);
    set({ sizePreference: size });
  },
  setFont(slot, pref) {
    if (slot === "sans") {
      writePreference(KEYS.sansFont, pref);
      set({ sansFont: pref });
    } else if (slot === "heading") {
      writePreference(KEYS.headingFont, pref);
      set({ headingFont: pref });
    } else {
      writePreference(KEYS.monoFont, pref);
      set({ monoFont: pref });
    }
  },
  setMode(mode) {
    set({ mode });
  },
  requestFontPrompt(slot, kind, initialValue) {
    set({ fontPromptRequest: { slot, kind, initialValue } });
  },
  closeFontPrompt() {
    set({ fontPromptRequest: null });
  },
}));
