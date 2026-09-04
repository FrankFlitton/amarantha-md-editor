import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type { AmaranthaConfig, ThemeFamily, ThemeMode } from "@amarantha/core";
import { createRegistry, personalWebsiteRegistry } from "@amarantha/mdx";
import { THEME_FAMILIES, themeId } from "@amarantha/theme";
import "./App.css";

const SAMPLE = `---
title: "Welcome to Amarantha"
tags: ["getting-started"]
---

# A markdown editor that doesn't rewrite your files

Amarantha edits Markdown and MDX **as rich text** — headings, bold and
italics, lists, links — while keeping the file underneath exactly as you
wrote it. No surprise reformatting the next time you save.

Try it out:

- Select this paragraph to see the floating formatting toolbar.
- Switch to **Source** (top right) to see the raw Markdown behind this page.
- Pick a theme from the dropdown, or toggle dark mode.

It also renders custom components inline, right alongside your prose:

<Mermaid chart={\`graph TD
  Write --> Edit
  Edit --> Ship\`} title="How it fits together" />

Use **Open file** above to try it on a Markdown or MDX file of your own.
`;

// Seeds the config editor with the demo's own component registry, so
// opening it shows a real, working amarantha.config.json rather than an
// empty shell.
const DEFAULT_CONFIG: AmaranthaConfig = {
  components: [...(personalWebsiteRegistry.list?.() ?? [])],
  frontmatter: {},
};

function App() {
  const [text, setText] = useState(SAMPLE);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [family, setFamily] = useState<ThemeFamily>("ember");
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MDXEditor only reads `markdown` as its *initial* content (it's
  // uncontrolled internally) — bumping this and folding it into
  // AmaranthaEditor's key forces a remount so opening a new file actually
  // replaces what's on screen. Same pattern as packages/desktop's App.tsx
  // and packages/vscode's WebviewApp.tsx.
  const [docGeneration, setDocGeneration] = useState(0);

  const [config, setConfig] = useState<AmaranthaConfig>(DEFAULT_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [configText, setConfigText] = useState(() => JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [configError, setConfigError] = useState<string | null>(null);

  const registry = useMemo(() => createRegistry(config.components ?? []), [config]);

  const mode2: ThemeMode = dark ? "dark" : "light";
  const currentThemeId = useMemo(() => themeId(family, mode2), [family, mode2]);

  // Mirrored onto <html>, not just the wrapper div below, so portaled UI
  // (the floating toolbar, its tooltip) resolves the theme correctly too —
  // see packages/theme/src/mdxeditor-adapter.css and docs/decisions.md
  // Session 5 for why this matters.
  useEffect(() => {
    document.documentElement.dataset.theme = currentThemeId;
  }, [currentThemeId]);

  // Cmd/Ctrl+O would otherwise fall through to the browser's own "Open
  // File" dialog (which navigates the tab to a local file, losing the
  // app) — capture it first so it opens into the editor instead.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file.text().then((content) => {
      setText(content);
      setDocGeneration((generation) => generation + 1);
    });
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

  const handleApplyConfig = useCallback(() => {
    let parsed: AmaranthaConfig;
    try {
      parsed = JSON.parse(configText) as AmaranthaConfig;
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Invalid JSON");
      return;
    }
    setConfig(parsed);
    setConfigError(null);
    if (parsed.theme && THEME_FAMILIES.some((option) => option.family === parsed.theme)) {
      setFamily(parsed.theme);
    }
  }, [configText]);

  return (
    <div className={`web-shell amarantha-app ${dark ? "dark" : "light-theme"}`} data-theme={currentThemeId}>
      <div className="web-toolbar">
        <span className="web-brand">Amarantha</span>

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
        <button type="button" aria-pressed={configOpen} onClick={() => setConfigOpen((open) => !open)}>
          Config
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

        <span className="web-toolbar-divider" aria-hidden="true" />

        <a
          className="web-toolbar-link"
          href="https://github.com/FrankFlitton/amarantha-md-editor"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>

        <div className="web-toolbar-group web-get-amarantha" role="group" aria-label="Get Amarantha">
          <button type="button" disabled title="Mac app — coming soon">
            Mac app
          </button>
          <button type="button" disabled title="VS Code extension — coming soon">
            VS Code
          </button>
          <button type="button" disabled title="Chrome extension — coming soon">
            Chrome
          </button>
        </div>
      </div>

      {configOpen && (
        <div className="web-config-panel">
          <div className="web-config-header">
            <span>amarantha.config.json</span>
            <span className="web-config-hint">
              Component definitions, frontmatter fields, and a theme opinion — same shape a repo's own
              amarantha.config.json would have. Applies to this demo only.
            </span>
            <button type="button" onClick={handleApplyConfig}>
              Apply
            </button>
          </div>
          <textarea
            className="web-config-textarea"
            spellCheck={false}
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
          />
          {configError && <div className="web-config-error">{configError}</div>}
        </div>
      )}

      <main className="web-editor-surface">
        <AmaranthaEditor
          key={`${docGeneration}:${mode}`}
          value={text}
          onChange={setText}
          mode={mode}
          proseSize="base"
          componentRegistry={registry}
        />
      </main>
    </div>
  );
}

export default App;
