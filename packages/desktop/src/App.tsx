import { useCallback, useEffect, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AmaranthaEditor, createDocumentStore, selectDirty, selectDisplayName, selectHasFrontmatter } from "@amarantha/editor";
import type { FontPreference } from "@amarantha/core";
import { themeId } from "@amarantha/theme";
import { desktopHost, pickMarkdownFileToOpen, pickMarkdownFileToSaveAs, renameDocument } from "./lib/desktopHost";
import { createImageHandlers } from "./lib/imageHost";
import { useSystemPrefersDark } from "./lib/preferences";
import { useFontVariable } from "./lib/useFontVariable";
import { installNativeMenu, type NativeMenuActions, type NativeMenuHandle, type NativeMenuState } from "./lib/nativeMenu";
import { openDocumentInNewWindow } from "./lib/windowManager";
import { placeCursorNearClick } from "./lib/placeCursorNearClick";
import { fontForSlot, useAppStore } from "./store";
import { FontPromptModal } from "./FontPromptModal";
import { ConflictModal } from "./ConflictModal";
import { DocumentHeader } from "./DocumentHeader";
import "./App.css";

/**
 * One document-lifecycle store per window (this module is re-evaluated
 * fresh for each Tauri window, matching today's one-store-of-local-state-
 * per-window behavior). Built from @amarantha/editor's host-portable
 * factory — a future VS Code host (RFC Milestone 5) supplies its own `deps`
 * and reuses this same load/save/conflict/reconcile/watch logic unchanged.
 */
const documentStore = createDocumentStore({
  host: desktopHost,
  pickFileToOpen: pickMarkdownFileToOpen,
  pickFileToSaveAs: pickMarkdownFileToSaveAs,
  renameDocument,
  openInNewWindow: openDocumentInNewWindow,
});

function App() {
  const {
    uri,
    text,
    savedText,
    frontmatterHidden,
    pendingFilename,
    renameError,
    saveError,
    conflict,
    componentRegistry,
    frontmatterFields,
    repoThemeFamily,
    setText,
    toggleFrontmatterHidden,
    handleRename,
    handleReloadConflict,
    handleOverwriteConflict,
    dismissConflict,
  } = documentStore();

  // Preferences (persisted) and transient UI (mode, font-prompt) live in the
  // desktop-only app store (./store.ts) — not portable to a future VS Code
  // host, unlike the document-lifecycle state above (RFC Milestone 5 seam).
  const {
    modePreference,
    familyPreference,
    sizePreference,
    sansFont,
    headingFont,
    monoFont,
    mode,
    fontPromptRequest,
    setFont,
    closeFontPrompt,
  } = useAppStore();

  const systemPrefersDark = useSystemPrefersDark();

  const dirty = selectDirty({ text, savedText });
  const hasFrontmatter = useMemo(() => selectHasFrontmatter({ text }), [text]);
  const imageHandlers = useMemo(() => createImageHandlers(uri), [uri]);
  const displayName = selectDisplayName({ uri, pendingFilename });

  const effectiveFamily = familyPreference ?? repoThemeFamily ?? "ember";
  const effectiveMode = modePreference === "system" ? (systemPrefersDark ? "dark" : "light") : modePreference;
  const effectiveThemeId = themeId(effectiveFamily, effectiveMode);

  const handleEditorSurfaceMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      // Source mode's textarea already fills the surface and handles this
      // natively; only the rich-text contentEditable box leaves dead space.
      if (mode !== "rich" || event.button !== 0) return;
      const surface = event.currentTarget;
      const target = event.target as Node;
      const contentEditableEl = surface.querySelector<HTMLElement>('[contenteditable="true"]');
      if (contentEditableEl?.contains(target)) return;
      if (placeCursorNearClick(surface, event.clientX, event.clientY)) {
        event.preventDefault();
      }
    },
    [mode]
  );

  useEffect(() => {
    // Windows opened via openDocumentInNewWindow carry the file to load in
    // an `open` query param; loadDocument resolves workspace config for
    // that file itself, so skip the generic repo-root resolution below to
    // avoid a race that could overwrite it with the wrong theme/registry.
    const openUri = new URLSearchParams(window.location.search).get("open");
    if (openUri) {
      void documentStore.getState().loadDocument(openUri);
      return;
    }
    void documentStore.getState().resolveWorkspaceConfig("");
  }, []);

  useEffect(() => {
    // A missing core:window:allow-set-title capability makes this reject
    // silently (permission denied) rather than throw visibly — surfaced
    // once via console.error instead of an unhandled rejection.
    getCurrentWindow()
      .setTitle(dirty ? `• ${displayName}` : displayName)
      .catch((error: unknown) => console.error("setTitle failed:", error));
  }, [displayName, dirty]);

  useEffect(() => {
    // `--am-*` tokens are only *defined* by tokens.css on whichever element
    // actually carries `data-theme` — normally the .amarantha-app div below.
    // Content portaled straight to document.body (the floating toolbar and
    // its tooltip, MDXEditor's own dialog/popup container) lives outside
    // that div's subtree, so it never saw the app's chosen theme at all —
    // only tokens.css's `:root:not([data-theme])` fallback, which tracks
    // raw OS prefers-color-scheme instead of the user's actual family/mode
    // preference. Mirroring data-theme onto <html> makes it resolve
    // correctly everywhere in the document, portals included, since custom
    // properties cascade from a real DOM ancestor regardless of where a
    // React portal's target node sits.
    document.documentElement.dataset.theme = effectiveThemeId;
  }, [effectiveThemeId]);

  const sansFontError = useFontVariable(sansFont, "sans", "--am-font-sans");
  const headingFontError = useFontVariable(headingFont, "heading", "--am-font-heading");
  const monoFontError = useFontVariable(monoFont, "mono", "--am-font-mono");

  // menuHandleRef is the one ref still needed here — an imperative handle to
  // the installed native menu object, not a stale-closure workaround. Zustand
  // actions never change identity across renders and getState() always
  // returns current data, so the menu's actions/state read straight from the
  // two stores below with no ref-mirroring needed at all (contrast with the
  // pre-store version of this file, which needed actionsRef/stateRef refreshed
  // every render purely to keep this once-installed menu from calling stale
  // handlers).
  const menuHandleRef = useRef<NativeMenuHandle | undefined>(undefined);

  function currentMenuState(): NativeMenuState {
    const app = useAppStore.getState();
    return {
      editorMode: app.mode,
      familyPreference: app.familyPreference,
      modePreference: app.modePreference,
      sizePreference: app.sizePreference,
      sansFont: app.sansFont,
      headingFont: app.headingFont,
      monoFont: app.monoFont,
    };
  }

  useEffect(() => {
    const actions: NativeMenuActions = {
      onOpen: () => void documentStore.getState().handleOpen(),
      onSave: () => void documentStore.getState().handleSave(),
      onSetEditorMode: (m) => useAppStore.getState().setMode(m),
      onSetFamily: (f) => useAppStore.getState().setFamilyPreference(f),
      onSetModePreference: (m) => useAppStore.getState().setModePreference(m),
      onSetSize: (s) => useAppStore.getState().setSizePreference(s),
      onSetFont: (slot, pref) => useAppStore.getState().setFont(slot, pref),
      onPromptCustomFont: (slot) => {
        const app = useAppStore.getState();
        const current = fontForSlot(app, slot);
        app.requestFontPrompt(slot, "fontsource", current.kind === "fontsource" ? (current.fontsourceId ?? "") : "");
      },
      onPromptSystemFont: (slot) => {
        const app = useAppStore.getState();
        const current = fontForSlot(app, slot);
        app.requestFontPrompt(slot, "system", current.kind === "system" ? (current.systemFamily ?? "") : "");
      },
    };
    void installNativeMenu(actions).then((handle) => {
      menuHandleRef.current = handle;
      void handle.sync(currentMenuState());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void menuHandleRef.current?.sync(currentMenuState());
  }, [mode, familyPreference, modePreference, sizePreference, sansFont, headingFont, monoFont]);

  return (
    <div
      className={`app-shell amarantha-app ${effectiveMode === "dark" ? "dark" : "light-theme"}`}
      data-theme={effectiveThemeId}
    >
      <DocumentHeader
        name={displayName}
        dirty={dirty}
        error={renameError ?? saveError}
        onRename={(newName) => void handleRename(newName)}
        hasFrontmatter={hasFrontmatter}
        frontmatterHidden={frontmatterHidden}
        onToggleFrontmatterVisibility={toggleFrontmatterHidden}
      />
      <main className="editor-surface" onMouseDown={handleEditorSurfaceMouseDown}>
        {/* MDXEditor's `markdown` prop (and its plugin list, including jsxPlugin's
            componentRegistry-derived descriptors) only seed initial state and
            don't react to later prop changes, so file/mode/registry changes
            need a remount rather than relying on the prop update. frontmatterFields/
            frontmatterHidden are deliberately excluded: amaranthaFrontmatterPlugin
            implements the update() lifecycle hook, so they push into the mounted
            editor live instead, preserving cursor/undo history across the toggle. */}
        <AmaranthaEditor
          key={`${uri ?? "untitled"}:${mode}:${componentRegistry ? "reg" : "noreg"}:${sizePreference}`}
          value={text}
          onChange={setText}
          mode={mode}
          imageUploadHandler={imageHandlers.imageUploadHandler}
          imagePreviewHandler={imageHandlers.imagePreviewHandler}
          componentRegistry={componentRegistry}
          proseSize={sizePreference}
          frontmatterFields={frontmatterFields}
          frontmatterHidden={frontmatterHidden}
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
        onCancel={closeFontPrompt}
        onSubmit={(value) => {
          if (!fontPromptRequest) return;
          const pref: FontPreference =
            fontPromptRequest.kind === "fontsource"
              ? { kind: "fontsource", fontsourceId: value }
              : { kind: "system", systemFamily: value };
          setFont(fontPromptRequest.slot, pref);
          closeFontPrompt();
        }}
      />
      <ConflictModal
        conflict={conflict}
        onReload={handleReloadConflict}
        onOverwrite={(event) => void handleOverwriteConflict(event)}
        onDismiss={dismissConflict}
      />
    </div>
  );
}

export default App;
