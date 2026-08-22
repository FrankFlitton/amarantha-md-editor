import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type { ComponentRegistry, FontPreference, FontSlot, ProseSize, ThemeFamily, ThemeModePreference } from "@amarantha/core";
import { DEFAULT_FONT_PREFERENCE } from "@amarantha/core";
import { themeId } from "@amarantha/theme";
import { desktopHost, pickMarkdownFileToOpen, pickMarkdownFileToSaveAs, renameDocument } from "./lib/desktopHost";
import { createImageHandlers } from "./lib/imageHost";
import { usePersistentState, useSystemPrefersDark } from "./lib/preferences";
import { useFontVariable } from "./lib/useFontVariable";
import { installNativeMenu, type NativeMenuActions, type NativeMenuHandle, type NativeMenuState } from "./lib/nativeMenu";
import { openDocumentInNewWindow } from "./lib/windowManager";
import { FontPromptModal, type FontPromptRequest } from "./FontPromptModal";
import { DocumentHeader } from "./DocumentHeader";
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
  const [headingFont, setHeadingFont] = usePersistentState<FontPreference>(
    "amarantha:font-heading",
    DEFAULT_FONT_PREFERENCE
  );
  const [monoFont, setMonoFont] = usePersistentState<FontPreference>("amarantha:font-mono", DEFAULT_FONT_PREFERENCE);
  const [fontPromptRequest, setFontPromptRequest] = useState<FontPromptRequest | null>(null);
  const [pendingFilename, setPendingFilename] = useState("Untitled.md");
  const [renameError, setRenameError] = useState<string | undefined>(undefined);

  const systemPrefersDark = useSystemPrefersDark();

  const dirty = text !== savedText;
  const imageHandlers = useMemo(() => createImageHandlers(uri), [uri]);
  const displayName = uri ? filenameFromUri(uri) : pendingFilename;

  const effectiveFamily = familyPreference ?? repoThemeFamily ?? "ember";
  const effectiveMode = modePreference === "system" ? (systemPrefersDark ? "dark" : "light") : modePreference;
  const effectiveThemeId = themeId(effectiveFamily, effectiveMode);

  const loadDocument = useCallback(async (targetUri: string) => {
    const doc = await desktopHost.readDocument(targetUri);
    setUri(doc.uri);
    setText(doc.text);
    setSavedText(doc.text);
    const { theme, componentRegistry } = await desktopHost.resolveWorkspaceConfig(doc.uri);
    setRepoThemeFamily(theme);
    setComponentRegistry(componentRegistry);
  }, []);

  const handleOpen = useCallback(async () => {
    const selected = await pickMarkdownFileToOpen();
    if (!selected) return;
    // A window with a document already open (saved or not) or an unsaved
    // untitled draft keeps its content — the new file opens in its own
    // window instead of clobbering it. Only a blank, untouched window
    // reuses itself.
    if (uri !== null || dirty) {
      await openDocumentInNewWindow(selected);
      return;
    }
    await loadDocument(selected);
  }, [uri, dirty, loadDocument]);

  const handleSave = useCallback(async () => {
    let targetUri = uri;
    if (!targetUri) {
      targetUri = (await pickMarkdownFileToSaveAs(pendingFilename)) ?? null;
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
  }, [uri, text, pendingFilename]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!uri) {
        setPendingFilename(newName);
        return;
      }
      try {
        const newUri = await renameDocument(uri, newName);
        setUri(newUri);
        setRenameError(undefined);
      } catch (error) {
        setRenameError(error instanceof Error ? error.message : "Rename failed");
      }
    },
    [uri]
  );

  const setFont = useCallback(
    (slot: FontSlot, pref: FontPreference) => {
      if (slot === "sans") setSansFont(pref);
      else if (slot === "heading") setHeadingFont(pref);
      else setMonoFont(pref);
    },
    [setSansFont, setHeadingFont, setMonoFont]
  );

  const fontForSlot = useCallback(
    (slot: FontSlot): FontPreference => (slot === "sans" ? sansFont : slot === "heading" ? headingFont : monoFont),
    [sansFont, headingFont, monoFont]
  );

  useEffect(() => {
    // Windows opened via openDocumentInNewWindow carry the file to load in
    // an `open` query param; loadDocument resolves workspace config for
    // that file itself, so skip the generic repo-root resolution below to
    // avoid a race that could overwrite it with the wrong theme/registry.
    const openUri = new URLSearchParams(window.location.search).get("open");
    if (openUri) {
      void loadDocument(openUri);
      return;
    }
    void desktopHost.resolveWorkspaceConfig("").then(({ theme, componentRegistry }) => {
      setRepoThemeFamily(theme);
      setComponentRegistry(componentRegistry);
    });
  }, [loadDocument]);

  useEffect(() => {
    // A missing core:window:allow-set-title capability makes this reject
    // silently (permission denied) rather than throw visibly — surfaced
    // once via console.error instead of an unhandled rejection.
    getCurrentWindow()
      .setTitle(dirty ? `• ${displayName}` : displayName)
      .catch((error: unknown) => console.error("setTitle failed:", error));
  }, [displayName, dirty]);

  const sansFontError = useFontVariable(sansFont, "sans", "--am-font-sans");
  const headingFontError = useFontVariable(headingFont, "heading", "--am-font-heading");
  const monoFontError = useFontVariable(monoFont, "mono", "--am-font-mono");

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
      const current = fontForSlot(slot);
      setFontPromptRequest({
        slot,
        kind: "fontsource",
        initialValue: current.kind === "fontsource" ? (current.fontsourceId ?? "") : "",
      });
    },
    onPromptSystemFont: (slot) => {
      const current = fontForSlot(slot);
      setFontPromptRequest({
        slot,
        kind: "system",
        initialValue: current.kind === "system" ? (current.systemFamily ?? "") : "",
      });
    },
  };
  stateRef.current = {
    editorMode: mode,
    familyPreference,
    modePreference,
    sizePreference,
    sansFont,
    headingFont,
    monoFont,
  };

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
  }, [mode, familyPreference, modePreference, sizePreference, sansFont, headingFont, monoFont]);

  return (
    <div
      className={`app-shell amarantha-app ${effectiveMode === "dark" ? "dark" : "light-theme"}`}
      data-theme={effectiveThemeId}
    >
      <DocumentHeader
        name={displayName}
        dirty={dirty}
        error={renameError}
        onRename={(newName) => void handleRename(newName)}
      />
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
      {(sansFontError || headingFontError || monoFontError) && (
        <div className="font-error-banner" data-testid="font-error-banner">
          {sansFontError && <span>Body font: {sansFontError}</span>}
          {headingFontError && <span>Heading font: {headingFontError}</span>}
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
