import { create } from "zustand";
import {
  hasFrontmatterBlock,
  reconcileMarkdown,
  type ComponentRegistry,
  type EditorHost,
  type ExternalChange,
  type FrontmatterFieldDefinition,
  type ThemeFamily,
} from "@amarantha/core";

/**
 * Everything the document store needs from its environment. Every dependency
 * is host-agnostic in *shape* — `host` is the RFC's own `EditorHost`
 * contract, and the four callbacks describe host-neutral intents ("pick a
 * file", "open elsewhere") rather than anything Tauri-specific. A desktop
 * host supplies Tauri dialogs/windows; a future VS Code host (RFC Milestone
 * 5) supplies its own file picker, its own "open in a new editor tab/panel"
 * behavior, and its own `EditorHost` — this store's load/save/conflict/
 * reconcile logic is reused unchanged either way.
 */
export interface DocumentStoreDeps {
  /** Only the subset of EditorHost this store actually calls — kind/getWorkspaceTrust aren't its concern. */
  host: Pick<EditorHost, "readDocument" | "writeDocument" | "watchDocument" | "resolveWorkspaceConfig">;
  pickFileToOpen(): Promise<string | undefined>;
  pickFileToSaveAs(defaultPath?: string): Promise<string | undefined>;
  renameDocument(uri: string, newName: string): Promise<string>;
  openInNewWindow(uri: string): Promise<void>;
}

export interface WorkspaceConfig {
  theme?: ThemeFamily;
  componentRegistry: ComponentRegistry;
  frontmatterFields: Record<string, FrontmatterFieldDefinition>;
}

export interface DocumentStoreState {
  uri: string | null;
  text: string;
  savedText: string;
  /**
   * The actual bytes currently believed to be on disk — distinct from
   * `savedText` (this store's own dirty-tracking baseline, the rich
   * editor's raw un-reconciled output). Used only as `reconcileMarkdown`'s
   * "original" argument at save time, so a save preserves whatever this
   * session's own edits didn't actually touch (RFC Milestone 1).
   */
  diskText: string;
  revision: string;
  conflict: ExternalChange | null;
  saveError: string | undefined;
  frontmatterHidden: boolean;
  pendingFilename: string;
  renameError: string | undefined;

  componentRegistry: ComponentRegistry | undefined;
  frontmatterFields: Record<string, FrontmatterFieldDefinition>;
  repoThemeFamily: ThemeFamily | undefined;

  setText(text: string): void;
  toggleFrontmatterHidden(): void;
  applyWorkspaceConfig(config: WorkspaceConfig): void;
  resolveWorkspaceConfig(uri: string): Promise<void>;
  loadDocument(targetUri: string): Promise<void>;
  handleOpen(): Promise<void>;
  handleSave(): Promise<void>;
  handleRename(newName: string): Promise<void>;
  handleReloadConflict(event: ExternalChange): void;
  handleOverwriteConflict(event: ExternalChange): Promise<void>;
  dismissConflict(): void;
}

function filenameFromUri(uri: string | null): string {
  if (!uri) return "Untitled";
  const parts = uri.split(/[\\/]/);
  return parts[parts.length - 1] || "Untitled";
}

/** Derived, not stored — always computed from `text`/`savedText` so it can never drift out of sync. */
export function selectDirty(state: Pick<DocumentStoreState, "text" | "savedText">): boolean {
  return state.text !== state.savedText;
}

export function selectHasFrontmatter(state: Pick<DocumentStoreState, "text">): boolean {
  return hasFrontmatterBlock(state.text);
}

export function selectDisplayName(state: Pick<DocumentStoreState, "uri" | "pendingFilename">): string {
  return state.uri ? filenameFromUri(state.uri) : state.pendingFilename;
}

function saveErrorFor(reason: "io" | "permission"): string {
  return reason === "io" ? "Couldn't save: a filesystem error occurred." : "Couldn't save: permission denied.";
}

/**
 * Builds one document-lifecycle store instance. A factory (not a module-level
 * singleton) so each host — and each test — constructs its own instance
 * against its own `deps`, with no shared state leaking between them.
 */
export function createDocumentStore(deps: DocumentStoreDeps) {
  const store = create<DocumentStoreState>()((set, get) => ({
    uri: null,
    text: "",
    savedText: "",
    diskText: "",
    revision: "",
    conflict: null,
    saveError: undefined,
    frontmatterHidden: false,
    pendingFilename: "Untitled.md",
    renameError: undefined,

    componentRegistry: undefined,
    frontmatterFields: {},
    repoThemeFamily: undefined,

    setText(text) {
      set({ text });
    },

    toggleFrontmatterHidden() {
      set((state) => ({ frontmatterHidden: !state.frontmatterHidden }));
    },

    applyWorkspaceConfig(config) {
      set({
        repoThemeFamily: config.theme,
        componentRegistry: config.componentRegistry,
        frontmatterFields: config.frontmatterFields,
      });
    },

    async resolveWorkspaceConfig(uri) {
      const config = await deps.host.resolveWorkspaceConfig(uri);
      get().applyWorkspaceConfig(config);
    },

    async loadDocument(targetUri) {
      const doc = await deps.host.readDocument(targetUri);
      set({
        uri: doc.uri,
        text: doc.text,
        savedText: doc.text,
        diskText: doc.text,
        revision: doc.revision,
        conflict: null,
        saveError: undefined,
        frontmatterHidden: false,
      });
      await get().resolveWorkspaceConfig(doc.uri);
    },

    async handleOpen() {
      const selected = await deps.pickFileToOpen();
      if (!selected) return;
      const { uri, text, savedText } = get();
      // A window with a document already open (saved or not) or an unsaved
      // untitled draft keeps its content — the new file opens elsewhere
      // instead of clobbering it. Only a blank, untouched window reuses itself.
      if (uri !== null || text !== savedText) {
        await deps.openInNewWindow(selected);
        return;
      }
      await get().loadDocument(selected);
    },

    async handleSave() {
      const { uri, text, revision, diskText, pendingFilename } = get();
      let targetUri = uri;
      if (!targetUri) {
        targetUri = (await deps.pickFileToSaveAs(pendingFilename)) ?? null;
        if (!targetUri) return;
        set({ uri: targetUri });
      }
      // Reconciled against diskText (not this store's own text/savedText), so
      // whatever this edit didn't actually touch keeps its exact original
      // bytes (RFC Milestone 1 — see @amarantha/core's reconcileMarkdown).
      const reconciled = reconcileMarkdown(diskText, text);
      const result = await deps.host.writeDocument({ uri: targetUri, baseRevision: revision, text: reconciled, reason: "save" });
      if (result.ok) {
        set({ savedText: text, diskText: reconciled, revision: result.revision, saveError: undefined });
      } else if (result.reason === "conflict" && result.current) {
        set({ conflict: { uri: targetUri, revision: result.current.revision, text: result.current.text } });
      } else {
        set({ saveError: saveErrorFor(result.reason === "io" ? "io" : "permission") });
      }
    },

    async handleRename(newName) {
      const { uri } = get();
      if (!uri) {
        set({ pendingFilename: newName });
        return;
      }
      try {
        const newUri = await deps.renameDocument(uri, newName);
        set({ uri: newUri, renameError: undefined });
      } catch (error) {
        set({ renameError: error instanceof Error ? error.message : "Rename failed" });
      }
    },

    handleReloadConflict(event) {
      set({ text: event.text, savedText: event.text, diskText: event.text, revision: event.revision, conflict: null });
    },

    async handleOverwriteConflict(event) {
      const { text } = get();
      // Reconciled against event.text (the disk's freshest known content,
      // just discovered) rather than diskText (this store's now-stale
      // baseline) — preserves as much of whatever's actually on disk as
      // this local buffer didn't touch, rather than blindly clobbering it.
      const reconciled = reconcileMarkdown(event.text, text);
      const result = await deps.host.writeDocument({ uri: event.uri, baseRevision: event.revision, text: reconciled, reason: "save" });
      if (result.ok) {
        set({ savedText: text, diskText: reconciled, revision: result.revision, saveError: undefined, conflict: null });
      } else if (result.reason === "conflict" && result.current) {
        // Disk moved again between reading it for this dialog and choosing
        // "Overwrite" — re-show the dialog with the newer content rather
        // than silently failing.
        set({ conflict: { uri: event.uri, revision: result.current.revision, text: result.current.text } });
      } else {
        set({ saveError: saveErrorFor(result.reason === "io" ? "io" : "permission") });
      }
    },

    dismissConflict() {
      set({ conflict: null });
    },
  }));

  // Never applied silently: while local edits are pending, an external
  // modification only ever surfaces as a conflict choice; a clean document
  // reloads and reprojects automatically (RFC "External File Edits and
  // Conflicts"). The host's own self-write suppression keeps this from
  // firing for the store's own saves. Owned by the store itself (not left to
  // a caller's effect) so watching is part of "what a loaded document does,"
  // not chrome any particular host has to remember to wire up.
  let watchSubscription: { dispose(): void } | undefined;
  store.subscribe((state, previous) => {
    if (state.uri === previous.uri) return;
    watchSubscription?.dispose();
    watchSubscription = undefined;
    if (!state.uri) return;
    watchSubscription = deps.host.watchDocument(state.uri, (event) => {
      const current = store.getState();
      if (selectDirty(current)) {
        store.setState({ conflict: event });
      } else {
        store.setState({ text: event.text, savedText: event.text, diskText: event.text, revision: event.revision });
      }
    });
  });

  return store;
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
