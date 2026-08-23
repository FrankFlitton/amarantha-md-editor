import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import type {
  ComponentRegistry,
  ExternalChange,
  FontPreference,
  FontSlot,
  FrontmatterFieldDefinition,
  ProseSize,
  ThemeFamily,
  ThemeModePreference,
} from "@amarantha/core";
import { DEFAULT_FONT_PREFERENCE, hasFrontmatterBlock, reconcileMarkdown } from "@amarantha/core";
import { themeId } from "@amarantha/theme";
import { desktopHost, pickMarkdownFileToOpen, pickMarkdownFileToSaveAs, renameDocument } from "./lib/desktopHost";
import { createImageHandlers } from "./lib/imageHost";
import { usePersistentState, useSystemPrefersDark } from "./lib/preferences";
import { useFontVariable } from "./lib/useFontVariable";
import { installNativeMenu, type NativeMenuActions, type NativeMenuHandle, type NativeMenuState } from "./lib/nativeMenu";
import { openDocumentInNewWindow } from "./lib/windowManager";
import { placeCursorNearClick } from "./lib/placeCursorNearClick";
import { FontPromptModal, type FontPromptRequest } from "./FontPromptModal";
import { ConflictModal } from "./ConflictModal";
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
  // The actual bytes currently believed to be on disk — distinct from
  // `savedText` (MDXEditor's own dirty-tracking baseline, its raw
  // un-reconciled output). Used only as reconcileMarkdown's "original"
  // argument at save time, so a save preserves whatever this session's own
  // edits didn't actually touch (RFC Milestone 1) without disturbing the
  // live editor's own dirty-flag bookkeeping.
  const [diskText, setDiskText] = useState("");
  const [revision, setRevision] = useState("");
  const [conflict, setConflict] = useState<ExternalChange | null>(null);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [componentRegistry, setComponentRegistry] = useState<ComponentRegistry | undefined>(undefined);
  const [frontmatterFields, setFrontmatterFields] = useState<Record<string, FrontmatterFieldDefinition>>({});
  const [frontmatterHidden, setFrontmatterHidden] = useState(false);
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
  // watchDocument's onChange fires from a subscription set up once per uri
  // (see the effect below) — a ref keeps it reading the current dirty state
  // instead of whatever it was when the subscription was created.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const hasFrontmatter = useMemo(() => hasFrontmatterBlock(text), [text]);
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
    setDiskText(doc.text);
    setRevision(doc.revision);
    setConflict(null);
    setSaveError(undefined);
    setFrontmatterHidden(false);
    const { theme, componentRegistry, frontmatterFields } = await desktopHost.resolveWorkspaceConfig(doc.uri);
    setRepoThemeFamily(theme);
    setComponentRegistry(componentRegistry);
    setFrontmatterFields(frontmatterFields);
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
    // Reconciled against diskText (not MDXEditor's own text/savedText), so
    // whatever this edit didn't actually touch keeps its exact original
    // bytes — the RFC's Milestone 1 fix for MDXEditor's own round-trip
    // normalizing markup (list bullets, emphasis markers, ...) it never
    // touched either (see @amarantha/core's reconcileMarkdown).
    const reconciled = reconcileMarkdown(diskText, text);
    const result = await desktopHost.writeDocument({
      uri: targetUri,
      baseRevision: revision,
      text: reconciled,
      reason: "save",
    });
    if (result.ok) {
      setSavedText(text);
      setDiskText(reconciled);
      setRevision(result.revision);
      setSaveError(undefined);
    } else if (result.reason === "conflict" && result.current) {
      setConflict({ uri: targetUri, revision: result.current.revision, text: result.current.text });
    } else {
      setSaveError(result.reason === "io" ? "Couldn't save: a filesystem error occurred." : "Couldn't save: permission denied.");
    }
  }, [uri, text, revision, diskText, pendingFilename]);

  // Never applied silently: while local edits are pending, an external
  // modification only ever surfaces as a conflict choice; a clean document
  // reloads and reprojects automatically (RFC "External File Edits and
  // Conflicts"). watchDocument's own self-write suppression (desktopHost.ts)
  // keeps this from firing for the app's own saves.
  useEffect(() => {
    if (!uri) return;
    const disposable = desktopHost.watchDocument(uri, (event) => {
      if (dirtyRef.current) {
        setConflict(event);
      } else {
        setText(event.text);
        setSavedText(event.text);
        setDiskText(event.text);
        setRevision(event.revision);
      }
    });
    return () => disposable.dispose();
  }, [uri]);

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

  const handleReloadConflict = useCallback((event: ExternalChange) => {
    setText(event.text);
    setSavedText(event.text);
    setDiskText(event.text);
    setRevision(event.revision);
    setConflict(null);
  }, []);

  const handleOverwriteConflict = useCallback(
    async (event: ExternalChange) => {
      // Reconciled against event.text (the disk's freshest known content,
      // just discovered) rather than diskText (this session's now-stale
      // baseline) — preserves as much of whatever's actually on disk as
      // this local buffer didn't touch, rather than blindly clobbering it.
      const reconciled = reconcileMarkdown(event.text, text);
      const result = await desktopHost.writeDocument({
        uri: event.uri,
        baseRevision: event.revision,
        text: reconciled,
        reason: "save",
      });
      if (result.ok) {
        setSavedText(text);
        setDiskText(reconciled);
        setRevision(result.revision);
        setSaveError(undefined);
        setConflict(null);
      } else if (result.reason === "conflict" && result.current) {
        // Disk moved again between reading it for this dialog and choosing
        // "Overwrite" — re-show the dialog with the newer content rather
        // than silently failing.
        setConflict({ uri: event.uri, revision: result.current.revision, text: result.current.text });
      } else {
        setSaveError(result.reason === "io" ? "Couldn't save: a filesystem error occurred." : "Couldn't save: permission denied.");
      }
    },
    [text]
  );

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
    void desktopHost.resolveWorkspaceConfig("").then(({ theme, componentRegistry, frontmatterFields }) => {
      setRepoThemeFamily(theme);
      setComponentRegistry(componentRegistry);
      setFrontmatterFields(frontmatterFields);
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
        error={renameError ?? saveError}
        onRename={(newName) => void handleRename(newName)}
        hasFrontmatter={hasFrontmatter}
        frontmatterHidden={frontmatterHidden}
        onToggleFrontmatterVisibility={() => setFrontmatterHidden((h) => !h)}
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
      <ConflictModal
        conflict={conflict}
        onReload={handleReloadConflict}
        onOverwrite={(event) => void handleOverwriteConflict(event)}
        onDismiss={() => setConflict(null)}
      />
    </div>
  );
}

export default App;
