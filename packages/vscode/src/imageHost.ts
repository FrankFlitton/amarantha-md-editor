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

/**
 * Resolves a markdown image src (relative/absolute local path, or a
 * remote/data URL passed through untouched) into a URI the webview is
 * actually allowed to load, via asWebviewUri — the VS Code equivalent of
 * desktop's convertFileSrc.
 */
export function resolveImagePreviewSrc(docFsPath: string, src: string, webview: vscode.Webview): string {
  if (isRemoteOrDataUrl(src)) return src;
  const dir = path.dirname(docFsPath);
  const absolute = path.resolve(dir, src);
  return webview.asWebviewUri(vscode.Uri.file(absolute)).toString();
}
