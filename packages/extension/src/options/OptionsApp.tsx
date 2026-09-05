import { useCallback, useEffect, useMemo, useState } from "react";
import { AmaranthaEditor } from "@amarantha/editor";
import type { ThemeFamily, ProseSize } from "@amarantha/core";
import { PROSE_SIZES, THEME_FAMILIES, themeId } from "@amarantha/theme";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExtensionSettings } from "../lib/settings";

const PREVIEW_MARKDOWN = `# Amarantha

This is how a rendered \`.md\` file looks with the settings on the left.

- Rich formatting, tables, and code blocks
- Read-only — nothing here writes back to the original page

\`\`\`ts
const greeting = "hello";
\`\`\`
`;

export function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void loadSettings().then((stored) => {
      setSettings(stored);
      setLoaded(true);
    });
  }, []);

  const update = useCallback((partial: Partial<ExtensionSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    void saveSettings(partial).then(() => setSavedAt(Date.now()));
  }, []);

  const prefersDark = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );
  const dark = settings.themeMode === "system" ? prefersDark : settings.themeMode === "dark";
  const currentThemeId = useMemo(() => themeId(settings.themeFamily, dark ? "dark" : "light"), [settings.themeFamily, dark]);

  if (!loaded) return null;

  return (
    <div className="am-options-shell">
      <div className="am-options-panel">
        <h1 className="am-options-title">Amarantha</h1>
        <p className="am-options-subtitle">Renders any raw .md file you land on across the web.</p>

        <div className="am-options-toggle-row">
          <label htmlFor="am-enabled">Enable rendering</label>
          <input
            id="am-enabled"
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
        </div>

        <div className="am-options-field">
          <label htmlFor="am-theme-family">Theme</label>
          <select
            id="am-theme-family"
            value={settings.themeFamily}
            onChange={(event) => update({ themeFamily: event.target.value as ThemeFamily })}
          >
            {THEME_FAMILIES.map(({ family, label }) => (
              <option key={family} value={family}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="am-options-field">
          <label htmlFor="am-theme-mode">Appearance</label>
          <select
            id="am-theme-mode"
            value={settings.themeMode}
            onChange={(event) => update({ themeMode: event.target.value as ExtensionSettings["themeMode"] })}
          >
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="am-options-field">
          <label htmlFor="am-prose-size">Text size</label>
          <select
            id="am-prose-size"
            value={settings.proseSize}
            onChange={(event) => update({ proseSize: event.target.value as ProseSize })}
          >
            {PROSE_SIZES.map(({ size, label }) => (
              <option key={size} value={size}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <p className="am-options-hint">
          Amarantha runs on any page whose URL ends in <code>.md</code> and that the browser is showing as raw text
          (for example a GitHub raw link) — it never touches normal HTML pages, and never writes back to the
          original file.
        </p>

        <p className="am-options-saved" aria-live="polite">
          {savedAt ? "Saved" : ""}
        </p>
      </div>

      <div className="am-options-preview">
        {/* data-theme/dark live on this same element as .am-options-preview-frame,
            not a nested div: the frame is what paints `background: var(--am-bg)`
            (options.css), and a CSS custom property only reaches descendants of
            whichever element sets it — putting the theme attributes one level
            down left the frame's own background stuck on the ambient default,
            never the picked theme's. */}
        <div
          className={`am-options-preview-frame amarantha-app ${dark ? "dark" : "light-theme"}`}
          data-theme={currentThemeId}
        >
          <AmaranthaEditor
            value={PREVIEW_MARKDOWN}
            onChange={() => {}}
            mode="rich"
            proseSize={settings.proseSize}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
