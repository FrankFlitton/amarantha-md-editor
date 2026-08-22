import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type { ComponentRegistry, FontPreference, FontSlot, ProseSize, ThemeFamily, ThemeModePreference } from "@amarantha/core";
import { DEFAULT_FONT_PREFERENCE } from "@amarantha/core";
import { themeId } from "@amarantha/theme";
import { desktopHost, pickMarkdownFileToOpen, pickMarkdownFileToSaveAs } from "./lib/desktopHost";
import { createImageHandlers } from "./lib/imageHost";
import { resolveFontFamily } from "./lib/fontHost";
import { usePersistentState, useSystemPrefersDark } from "./lib/preferences";
import { installNativeMenu, type NativeMenuActions, type NativeMenuHandle, type NativeMenuState } from "./lib/nativeMenu";
import { FontPromptModal, type FontPromptRequest } from "./FontPromptModal";
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
  const [fontPromptRequest, setFontPromptRequest] = useState<FontPromptRequest | null>(null);

  const systemPrefersDark = useSystemPrefersDark();

  const dirty = text !== savedText;
  const imageHandlers = useMemo(() => createImageHandlers(uri), [uri]);

  const effectiveFamily = familyPreference ?? repoThemeFamily ?? "ember";
  const effectiveMode = modePreference === "system" ? (systemPrefersDark ? "dark" : "light") : modePreference;
  const effectiveThemeId = themeId(effectiveFamily, effectiveMode);

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

  const setFont = useCallback(
    (slot: FontSlot, pref: FontPreference) => {
      if (slot === "sans") setSansFont(pref);
      else setMonoFont(pref);
    },
    [setSansFont, setMonoFont]
  );

  useEffect(() => {
    void desktopHost.resolveWorkspaceConfig("").then(({ theme, componentRegistry }) => {
      setRepoThemeFamily(theme);
      setComponentRegistry(componentRegistry);
    });
  }, []);

  useEffect(() => {
    void getCurrentWindow().setTitle(dirty ? `• ${filenameFromUri(uri)}` : filenameFromUri(uri));
  }, [uri, dirty]);

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

  // The native menu (installed once) and its action callbacks must never see
  // stale state: actionsRef/stateRef are refreshed every render and the menu
  // only ever calls through them, rather than closing over this render's values.
  const actionsRef = useRef<NativeMenuActions>(null as unknown as NativeMenuActions);
  const stateRef = useRef<NativeMenuState>(null as unknown as NativeMenuState);
  const menuHandleRef = useRef<NativeMenuHandle | undefined>(undefined);

  actionsRef.current = {
    onOpen: () => void handleOpen(),
    onSave: () => void handleSave(),
    onSetEditorMode: setMode,
    onSetFamily: setFamilyPreference,
    onSetModePreference: setModePreference,
    onSetSize: setSizePreference,
    onSetFont: setFont,
    onPromptCustomFont: (slot) => {
      const current = slot === "sans" ? sansFont : monoFont;
      setFontPromptRequest({
        slot,
        kind: "fontsource",
        initialValue: current.kind === "fontsource" ? (current.fontsourceId ?? "") : "",
      });
    },
    onPromptSystemFont: (slot) => {
      const current = slot === "sans" ? sansFont : monoFont;
      setFontPromptRequest({
        slot,
        kind: "system",
        initialValue: current.kind === "system" ? (current.systemFamily ?? "") : "",
      });
    },
  };
  stateRef.current = { editorMode: mode, familyPreference, modePreference, sizePreference, sansFont, monoFont };

  useEffect(() => {
    const stableActions: NativeMenuActions = {
      onOpen: () => actionsRef.current.onOpen(),
      onSave: () => actionsRef.current.onSave(),
      onSetEditorMode: (m) => actionsRef.current.onSetEditorMode(m),
      onSetFamily: (f) => actionsRef.current.onSetFamily(f),
      onSetModePreference: (m) => actionsRef.current.onSetModePreference(m),
      onSetSize: (s) => actionsRef.current.onSetSize(s),
      onSetFont: (slot, pref) => actionsRef.current.onSetFont(slot, pref),
      onPromptCustomFont: (slot) => actionsRef.current.onPromptCustomFont(slot),
      onPromptSystemFont: (slot) => actionsRef.current.onPromptSystemFont(slot),
    };
    void installNativeMenu(stableActions).then((handle) => {
      menuHandleRef.current = handle;
      void handle.sync(stateRef.current);
    });
  }, []);

  useEffect(() => {
    void menuHandleRef.current?.sync(stateRef.current);
  }, [mode, familyPreference, modePreference, sizePreference, sansFont, monoFont]);

  return (
    <div
      className={`app-shell amarantha-app ${effectiveMode === "dark" ? "dark" : "light-theme"}`}
      data-theme={effectiveThemeId}
    >
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
      {(sansFontError || monoFontError) && (
        <div className="font-error-banner" data-testid="font-error-banner">
          {sansFontError && <span>Body font: {sansFontError}</span>}
          {monoFontError && <span>Code font: {monoFontError}</span>}
        </div>
      )}
      <FontPromptModal
        request={fontPromptRequest}
        onCancel={() => setFontPromptRequest(null)}
        onSubmit={(value) => {
          if (!fontPromptRequest) return;
          const pref: FontPreference =
            fontPromptRequest.kind === "fontsource"
              ? { kind: "fontsource", fontsourceId: value }
              : { kind: "system", systemFamily: value };
          setFont(fontPromptRequest.slot, pref);
          setFontPromptRequest(null);
        }}
      />
    </div>
  );
}

export default App;
