import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { isRemoteOrDataUrl, sanitizeAssetFileName } from "@amarantha/core";

/** file-name -> a collision-resistant, filesystem-safe asset file name
 *  (mirrors packages/desktop/src/lib/imageHost.ts's toAssetFileName). */
function toAssetFileName(originalName: string, now: number = Date.now()): string {
  return `${now.toString(36)}-${sanitizeAssetFileName(originalName)}`;
}

/**
 * Saves a pasted/dropped image (base64-encoded over the webview message
 * channel, since a webview has no real filesystem access) into an assets/
 * folder next to the document, and returns the relative markdown src to
 * embed — same convention as desktop's imageHost.ts.
 */
export async function saveUploadedImage(docFsPath: string, name: string, dataBase64: string): Promise<string> {
  const dir = path.dirname(docFsPath);
  const assetsDir = path.join(dir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });
  const fileName = toAssetFileName(name);
  const destPath = path.join(assetsDir, fileName);
  await fs.writeFile(destPath, Buffer.from(dataBase64, "base64"));
  return `assets/${fileName}`;
}

export interface ImagePrefixOptions {
  /** amarantha.config.json's `imagePrefix`, if any (see workspaceConfig.ts). */
  imagePrefix?: string;
  imagePrefixDir?: string;
}

async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(
    () => true,
    () => false
  );
}

/**
 * Resolves a markdown image src (relative/absolute local path, or a
 * remote/data URL passed through untouched) into a URI the webview is
 * actually allowed to load, via asWebviewUri — the VS Code equivalent of
 * desktop's convertFileSrc.
 *
 * Tries more than one candidate location, in order, and uses the first that
 * actually exists on disk: the usual document-relative resolution first,
 * then — if the repo declares `imagePrefix` — that prefix plus the src with
 * any single leading slash stripped. Covers Jamstack-style repos where
 * markdown content and public assets live in separate trees (e.g. a
 * `/img/foo.png` src in markdown under `content/`, physically at
 * `<repo>/src/public/img/foo.png` — `imagePrefix: "src/public"` finds it).
 * Falls back to the plain document-relative candidate if nothing resolves,
 * so this is never worse than the single-candidate behavior it replaces.
 */
export async function resolveImagePreviewSrc(
  docFsPath: string,
  src: string,
  webview: vscode.Webview,
  options: ImagePrefixOptions = {}
): Promise<string> {
  if (isRemoteOrDataUrl(src)) return src;

  const docRelative = path.resolve(path.dirname(docFsPath), src);
  const candidates = [docRelative];
  if (options.imagePrefix && options.imagePrefixDir) {
    const stripped = src.replace(/^[/\\]+/, "");
    candidates.push(path.resolve(options.imagePrefixDir, options.imagePrefix, stripped));
  }

  let resolved = docRelative;
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      resolved = candidate;
      break;
    }
  }
  return webview.asWebviewUri(vscode.Uri.file(resolved)).toString();
}
