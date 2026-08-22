import { useCallback, useEffect, useMemo, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type { ComponentRegistry, FontPreference, ProseSize, ThemeFamily, ThemeModePreference } from "@amarantha/core";
import { DEFAULT_FONT_PREFERENCE } from "@amarantha/core";
import { PROSE_SIZES, THEME_FAMILIES, themeId } from "@amarantha/theme";
import { desktopHost, pickMarkdownFileToOpen, pickMarkdownFileToSaveAs } from "./lib/desktopHost";
import { createImageHandlers } from "./lib/imageHost";
import { resolveFontFamily } from "./lib/fontHost";
import { usePersistentState, useSystemPrefersDark } from "./lib/preferences";
import { FontPicker } from "./FontPicker";
import "./App.css";

function filenameFromUri(uri: string | null): string {
  if (!uri) return "Untitled";
  const parts = uri.split(/[\\/]/);
  return parts[parts.length - 1] || "Untitled";
}

function App() {
  const [uri, setUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [mode, setMode] = useState<EditorMode>("rich");
  const [componentRegistry, setComponentRegistry] = useState<ComponentRegistry | undefined>(undefined);
  const [repoThemeFamily, setRepoThemeFamily] = useState<ThemeFamily | undefined>(undefined);

  const [modePreference, setModePreference] = usePersistentState<ThemeModePreference>("amarantha:mode", "system");
  const [familyPreference, setFamilyPreference] = usePersistentState<ThemeFamily | undefined>(
    "amarantha:family",
    undefined
  );
  const [sizePreference, setSizePreference] = usePersistentState<ProseSize>("amarantha:size", "base");
  const [sansFont, setSansFont] = usePersistentState<FontPreference>("amarantha:font-sans", DEFAULT_FONT_PREFERENCE);
  const [monoFont, setMonoFont] = usePersistentState<FontPreference>("amarantha:font-mono", DEFAULT_FONT_PREFERENCE);
  const [sansFontError, setSansFontError] = useState<string | undefined>(undefined);
  const [monoFontError, setMonoFontError] = useState<string | undefined>(undefined);

  const systemPrefersDark = useSystemPrefersDark();

  const dirty = text !== savedText;
  const imageHandlers = useMemo(() => createImageHandlers(uri), [uri]);

  const effectiveFamily = familyPreference ?? repoThemeFamily ?? "ember";
  const effectiveMode = modePreference === "system" ? (systemPrefersDark ? "dark" : "light") : modePreference;
  const effectiveThemeId = themeId(effectiveFamily, effectiveMode);

  useEffect(() => {
    // Resolved once up front so a fresh, unsaved buffer still gets rich
    // component editing and a theme; re-resolved per file below once the
    // file actually has a resolvable amarantha.config.json ancestry.
    void desktopHost.resolveWorkspaceConfig("").then(({ theme, componentRegistry }) => {
      setRepoThemeFamily(theme);
      setComponentRegistry(componentRegistry);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void resolveFontFamily(sansFont, "sans")
      .then((family) => {
        if (cancelled) return;
        setSansFontError(undefined);
        document.documentElement.style.setProperty("--am-font-sans", family);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSansFontError(error instanceof Error ? error.message : "Failed to load font");
      });
    return () => {
      cancelled = true;
    };
  }, [sansFont]);

  useEffect(() => {
    let cancelled = false;
    void resolveFontFamily(monoFont, "mono")
      .then((family) => {
        if (cancelled) return;
        setMonoFontError(undefined);
        document.documentElement.style.setProperty("--am-font-mono", family);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMonoFontError(error instanceof Error ? error.message : "Failed to load font");
      });
    return () => {
      cancelled = true;
    };
  }, [monoFont]);

  const handleOpen = useCallback(async () => {
    const selected = await pickMarkdownFileToOpen();
    if (!selected) return;
    const doc = await desktopHost.readDocument(selected);
    setUri(doc.uri);
    setText(doc.text);
    setSavedText(doc.text);
    const { theme, componentRegistry } = await desktopHost.resolveWorkspaceConfig(doc.uri);
    setRepoThemeFamily(theme);
    setComponentRegistry(componentRegistry);
  }, []);

  const handleSave = useCallback(async () => {
    let targetUri = uri;
    if (!targetUri) {
      targetUri = (await pickMarkdownFileToSaveAs()) ?? null;
      if (!targetUri) return;
      setUri(targetUri);
    }
    const result = await desktopHost.writeDocument({
      uri: targetUri,
      baseRevision: "",
      text,
      reason: "save",
    });
    if (result.ok) {
      setSavedText(text);
    }
  }, [uri, text]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key.toLowerCase() === "s" && !event.shiftKey) {
        event.preventDefault();
        void handleSave();
      } else if (event.key.toLowerCase() === "m" && event.shiftKey) {
        event.preventDefault();
        setMode((current) => (current === "rich" ? "source" : "rich"));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return (
    <div
      className={`app-shell amarantha-app ${effectiveMode === "dark" ? "dark" : "light-theme"}`}
      data-theme={effectiveThemeId}
    >
      <header className="titlebar" data-testid="titlebar">
        <span className="filename" data-testid="filename">
          {filenameFromUri(uri)}
        </span>
        {dirty && <span className="dirty-dot" data-testid="dirty-dot" aria-label="unsaved changes" />}
        <div className="spacer" />
        <select
          data-testid="theme-family-select"
          value={familyPreference ?? ""}
          onChange={(event) => setFamilyPreference(event.target.value ? (event.target.value as ThemeFamily) : undefined)}
          title="Theme"
        >
          <option value="">Theme: repo default</option>
          {THEME_FAMILIES.map(({ family, label }) => (
            <option key={family} value={family}>
              {label}
            </option>
          ))}
        </select>
        <select
          data-testid="theme-mode-select"
          value={modePreference}
          onChange={(event) => setModePreference(event.target.value as ThemeModePreference)}
          title="Light / Dark"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <select
          data-testid="prose-size-select"
          value={sizePreference}
          onChange={(event) => setSizePreference(event.target.value as ProseSize)}
          title="Text size"
        >
          {PROSE_SIZES.map(({ size, label }) => (
            <option key={size} value={size}>
              {label}
            </option>
          ))}
        </select>
        <FontPicker slot="sans" value={sansFont} onChange={setSansFont} error={sansFontError} />
        <FontPicker slot="mono" value={monoFont} onChange={setMonoFont} error={monoFontError} />
        <button type="button" data-testid="open-button" onClick={() => void handleOpen()}>
          Open
        </button>
        <button type="button" data-testid="save-button" onClick={() => void handleSave()}>
          Save
        </button>
        <button
          type="button"
          data-testid="mode-toggle-button"
          onClick={() => setMode((current) => (current === "rich" ? "source" : "rich"))}
        >
          {mode === "rich" ? "Source" : "Rich"}
        </button>
      </header>
      <main className="editor-surface">
        {/* MDXEditor's `markdown` prop (and its plugin list, including jsxPlugin's
            componentRegistry-derived descriptors) only seed initial state and
            don't react to later prop changes, so file/mode/registry changes
            need a remount rather than relying on the prop update. */}
        <AmaranthaEditor
          key={`${uri ?? "untitled"}:${mode}:${componentRegistry ? "reg" : "noreg"}:${sizePreference}`}
          value={text}
          onChange={setText}
          mode={mode}
          imageUploadHandler={imageHandlers.imageUploadHandler}
          imagePreviewHandler={imageHandlers.imagePreviewHandler}
          componentRegistry={componentRegistry}
          proseSize={sizePreference}
        />
      </main>
    </div>
  );
}

export default App;
