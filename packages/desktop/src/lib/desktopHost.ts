import { exists, readTextFile, rename, watch, writeTextFile } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  discoverWorkspaceConfig,
  hashText,
  toLoadedDocument,
  type Disposable,
  type EditorHost,
  type ExternalChange,
  type WorkspaceHostConfig,
  type WriteRequest,
  type WriteResult,
} from "@amarantha/core";
import { createRegistry } from "@amarantha/mdx";
import { tauriFsAdapter } from "./tauriFsAdapter";

/**
 * Tracks the last revision this host itself produced (via read or write)
 * for each open uri, so watchDocument can tell "the disk changed because we
 * just saved it" apart from a genuine external edit — both fire the same
 * fs-watch event, and only the latter should ever surface to the app.
 */
const knownRevisions = new Map<string, string>();

/**
 * The Tauri-backed EditorHost. readDocument/writeDocument/watchDocument are
 * functionally real; getWorkspaceTrust remains a stub so a future VS Code
 * host implements against the same shape (RFC Milestones 3-5).
 */
export const desktopHost: EditorHost = {
  kind: "desktop",

  async readDocument(uri) {
    const text = await readTextFile(uri);
    const doc = toLoadedDocument(uri, text);
    knownRevisions.set(uri, doc.revision);
    return doc;
  },

  // Never overwrites silently: if the caller last read `baseRevision` and the
  // file has since changed on disk to something else, this refuses to write
  // and hands back the current on-disk content instead (RFC Milestone 4). An
  // empty baseRevision means "no baseline was ever loaded" (a brand-new
  // document) — nothing to conflict against, so that case always proceeds
  // (the native Save As dialog already confirms an overwrite of an existing
  // path in that flow).
  async writeDocument(request: WriteRequest): Promise<WriteResult> {
    try {
      if (request.baseRevision && (await exists(request.uri))) {
        const onDiskText = await readTextFile(request.uri);
        const onDiskRevision = hashText(onDiskText);
        if (onDiskRevision !== request.baseRevision) {
          return { ok: false, reason: "conflict", current: toLoadedDocument(request.uri, onDiskText) };
        }
      }
      await writeTextFile(request.uri, request.text);
      const revision = hashText(request.text);
      knownRevisions.set(request.uri, revision);
      return { ok: true, revision };
    } catch {
      return { ok: false, reason: "io" };
    }
  },

  watchDocument(uri, onChange: (event: ExternalChange) => void): Disposable {
    let disposed = false;
    let unwatch: (() => void) | undefined;

    void watch(
      uri,
      () => {
        void (async () => {
          if (disposed) return;
          let currentText: string;
          try {
            currentText = await readTextFile(uri);
          } catch {
            // File removed or momentarily unreadable mid-write; ignore this
            // event rather than surface a conflict over nothing.
            return;
          }
          const revision = hashText(currentText);
          if (revision === knownRevisions.get(uri)) return; // our own write, or a no-op touch
          knownRevisions.set(uri, revision);
          onChange({ uri, revision, text: currentText });
        })();
      },
      { delayMs: 500 }
    ).then((fn) => {
      if (disposed) fn();
      else unwatch = fn;
    });

    return {
      dispose() {
        disposed = true;
        unwatch?.();
      },
    };
  },

  async getWorkspaceTrust() {
    // TODO(future): real trust model (RFC "Plugin Security and Workspace Trust").
    return { trusted: true };
  },

  async resolveWorkspaceConfig(uri): Promise<WorkspaceHostConfig> {
    const { theme, componentDefinitions, frontmatterFields } = await discoverWorkspaceConfig(uri, tauriFsAdapter);
    return { theme, componentRegistry: createRegistry(componentDefinitions), frontmatterFields };
  },
};

export async function pickMarkdownFileToOpen(): Promise<string | undefined> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "mdx"] }],
  });
  return typeof selected === "string" ? selected : undefined;
}

export async function pickMarkdownFileToSaveAs(defaultPath?: string): Promise<string | undefined> {
  const selected = await save({
    defaultPath,
    filters: [{ name: "Markdown", extensions: ["md", "mdx"] }],
  });
  return selected ?? undefined;
}

/**
 * Renames the file at `uri` to `newName` (kept alongside its existing
 * directory) and returns the new uri. Refuses to clobber an existing file
 * at the target path — the caller should surface that as an error rather
 * than silently overwriting someone else's file.
 */
export async function renameDocument(uri: string, newName: string): Promise<string> {
  const dir = await dirname(uri);
  const newUri = await join(dir, newName);
  if (newUri === uri) return uri;
  if (await exists(newUri)) {
    throw new Error(`"${newName}" already exists`);
  }
  await rename(uri, newUri);
  return newUri;
}
