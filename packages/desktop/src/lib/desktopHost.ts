import { exists, readTextFile, rename, writeTextFile } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  discoverWorkspaceConfig,
  hashText,
  toLoadedDocument,
  type EditorHost,
  type WorkspaceHostConfig,
  type WriteRequest,
  type WriteResult,
} from "@amarantha/core";
import { createRegistry } from "@amarantha/mdx";
import { tauriFsAdapter } from "./tauriFsAdapter";

/**
 * The Tauri-backed EditorHost. Only readDocument/writeDocument are
 * functionally real this session; the rest are stubs so a future VS Code
 * host implements against the same shape (RFC Milestones 3-5).
 */
export const desktopHost: EditorHost = {
  kind: "desktop",

  async readDocument(uri) {
    const text = await readTextFile(uri);
    return toLoadedDocument(uri, text);
  },

  // baseRevision is threaded through but unchecked — no real conflict
  // detection yet (RFC Milestone 4).
  async writeDocument(request: WriteRequest): Promise<WriteResult> {
    try {
      await writeTextFile(request.uri, request.text);
      return { ok: true, revision: hashText(request.text) };
    } catch {
      return { ok: false, reason: "io" };
    }
  },

  watchDocument() {
    // TODO(future): real fs watcher + conflict UI (RFC Milestone 4).
    return { dispose() {} };
  },

  async getWorkspaceTrust() {
    // TODO(future): real trust model (RFC "Plugin Security and Workspace Trust").
    return { trusted: true };
  },

  async resolveWorkspaceConfig(uri): Promise<WorkspaceHostConfig> {
    const { theme, componentDefinitions } = await discoverWorkspaceConfig(uri, tauriFsAdapter);
    return { theme, componentRegistry: createRegistry(componentDefinitions) };
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
