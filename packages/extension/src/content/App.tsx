import { useMemo, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import { themeId } from "@amarantha/theme";
import type { ExtensionSettings } from "../lib/settings";

export interface ContentAppProps {
  markdown: string;
  settings: ExtensionSettings;
  sourceUrl: string;
  prefersDark: boolean;
}

export function ContentApp({ markdown, settings, sourceUrl, prefersDark }: ContentAppProps) {
  const [mode, setMode] = useState<EditorMode>("rich");

  const dark = settings.themeMode === "system" ? prefersDark : settings.themeMode === "dark";
  const currentThemeId = useMemo(() => themeId(settings.themeFamily, dark ? "dark" : "light"), [settings.themeFamily, dark]);

  return (
    <div className={`am-ext-shell amarantha-app ${dark ? "dark" : "light-theme"}`} data-theme={currentThemeId}>
      <div className="am-ext-bar">
        <span className="am-ext-brand">Amarantha</span>
        <span className="am-ext-source" title={sourceUrl}>
          {sourceUrl}
        </span>
        <span className="am-ext-spacer" />
        <div className="am-ext-mode-group" role="group" aria-label="View mode">
          <button type="button" aria-pressed={mode === "rich"} onClick={() => setMode("rich")}>
            Rich
          </button>
          <button type="button" aria-pressed={mode === "source"} onClick={() => setMode("source")}>
            Source
          </button>
        </div>
      </div>
      <main className="am-ext-surface">
        <AmaranthaEditor value={markdown} onChange={() => {}} mode={mode} proseSize={settings.proseSize} readOnly />
      </main>
    </div>
  );
}
