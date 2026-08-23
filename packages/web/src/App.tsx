import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type { ThemeFamily, ThemeMode } from "@amarantha/core";
import { personalWebsiteRegistry } from "@amarantha/mdx";
import { THEME_FAMILIES, themeId } from "@amarantha/theme";
import "./App.css";

const SAMPLE = `---
title: "Draft proposal"
status: draft
tags: ["design", "editor"]
---

# Amarantha web harness

A plain-browser build of the editor — no Tauri involved. Use this to
visually verify UI changes (themes, the frontmatter editor, the toolbar)
without stubbing Tauri's IPC bridge by hand each time.

Try selecting this sentence to see the floating toolbar and the
selection stats in the header.

<Mermaid chart={\`graph TD
  A --> B
  B --> C\`} title="Demo diagram" />
`;

function App() {
  const [text, setText] = useState(SAMPLE);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [family, setFamily] = useState<ThemeFamily>("ember");
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mode2: ThemeMode = dark ? "dark" : "light";
  const currentThemeId = useMemo(() => themeId(family, mode2), [family, mode2]);

  // Mirrored onto <html>, not just the wrapper div below, so portaled UI
  // (the floating toolbar, its tooltip) resolves the theme correctly too —
  // see packages/theme/src/mdxeditor-adapter.css and docs/decisions.md
  // Session 5 for why this matters.
  useEffect(() => {
    document.documentElement.dataset.theme = currentThemeId;
  }, [currentThemeId]);

  const handleOpenFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file.text().then(setText);
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text);
  }, [text]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.md";
    link.click();
    URL.revokeObjectURL(url);
  }, [text]);

  return (
    <div className={`web-shell amarantha-app ${dark ? "dark" : "light-theme"}`} data-theme={currentThemeId}>
      <div className="web-toolbar">
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Open file
        </button>
        <input ref={fileInputRef} type="file" accept=".md,.mdx" hidden onChange={handleOpenFile} />
        <button type="button" onClick={handleCopy}>
          Copy markdown
        </button>
        <button type="button" onClick={handleDownload}>
          Download
        </button>

        <span className="web-toolbar-spacer" />

        <div className="web-toolbar-group" role="group" aria-label="Editor mode">
          <button type="button" aria-pressed={mode === "rich"} onClick={() => setMode("rich")}>
            Rich
          </button>
          <button type="button" aria-pressed={mode === "source"} onClick={() => setMode("source")}>
            Source
          </button>
        </div>

        <select value={family} onChange={(event) => setFamily(event.target.value as ThemeFamily)}>
          {THEME_FAMILIES.map(({ family: familyOption, label }) => (
            <option key={familyOption} value={familyOption}>
              {label}
            </option>
          ))}
        </select>

        <button type="button" aria-pressed={dark} onClick={() => setDark((d) => !d)}>
          {dark ? "Dark" : "Light"}
        </button>
      </div>

      <main className="web-editor-surface">
        <AmaranthaEditor
          value={text}
          onChange={setText}
          mode={mode}
          proseSize="base"
          componentRegistry={personalWebsiteRegistry}
        />
      </main>
    </div>
  );
}

export default App;
