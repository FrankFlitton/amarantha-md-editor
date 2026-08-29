import type { ProseSize, ThemeFamily } from "@amarantha/core";

/**
 * Persisted via chrome.storage.sync (small, roams with the user's Chrome
 * profile) — this is the entire configuration surface exposed in
 * options.html and read by the content script on every matched page.
 */
export interface ExtensionSettings {
  /** Master on/off switch. The content script still runs on every *.md page
   *  (that's fixed at install time by manifest.json's static match list),
   *  but bails out immediately when this is false — see content/main.tsx. */
  enabled: boolean;
  themeFamily: ThemeFamily;
  /** "system" follows prefers-color-scheme at render time rather than pinning
   *  a value, matching packages/web's default behavior. */
  themeMode: "light" | "dark" | "system";
  proseSize: ProseSize;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  themeFamily: "ember",
  themeMode: "system",
  proseSize: "base",
};

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return stored as ExtensionSettings;
}

export async function saveSettings(next: Partial<ExtensionSettings>): Promise<void> {
  await chrome.storage.sync.set(next);
}

/** Fires on any change, from this context or another (e.g. options.html
 *  saving while a content script is already mounted on a *.md tab). */
export function onSettingsChanged(callback: (next: ExtensionSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== "sync") return;
    const relevant = Object.keys(changes).some((key) => key in DEFAULT_SETTINGS);
    if (!relevant) return;
    void loadSettings().then(callback);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
