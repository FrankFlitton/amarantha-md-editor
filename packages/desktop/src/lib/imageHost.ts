import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { arrayBufferToBase64, isRemoteOrDataUrl, sanitizeAssetFileName } from "@amarantha/core";
import type { ImagePreviewHandler, ImageUploadHandler } from "@mdxeditor/editor";

export interface ImageHandlers {
  imageUploadHandler: ImageUploadHandler;
  imagePreviewHandler: ImagePreviewHandler;
}

/** file.name -> a collision-resistant, filesystem-safe asset file name. */
export function toAssetFileName(originalName: string, now: number = Date.now()): string {
  return `${now.toString(36)}-${sanitizeAssetFileName(originalName)}`;
}

/**
 * Creates the image upload/preview handlers for a document at `docUri`.
 * When docUri is null (an unsaved buffer with nowhere to put an assets/
 * folder yet), pasted images are inlined as data URLs instead — acceptable
 * for v0; the RFC's real asset-relocation-on-save flow is future work.
 */
export function createImageHandlers(docUri: string | null): ImageHandlers {
  return {
    imageUploadHandler: async (file: File): Promise<string> => {
      if (!docUri) {
        const buffer = await file.arrayBuffer();
        return `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
      }
      const dir = await dirname(docUri);
      const assetsDir = await join(dir, "assets");
      if (!(await exists(assetsDir))) {
        await mkdir(assetsDir, { recursive: true });
      }
      const fileName = toAssetFileName(file.name);
      const destPath = await join(assetsDir, fileName);
      const bytes = new Uint8Array(await file.arrayBuffer());
      await writeFile(destPath, bytes);
      return `assets/${fileName}`;
    },

    imagePreviewHandler: async (src: string): Promise<string> => {
      if (isRemoteOrDataUrl(src) || !docUri) return src;
      const dir = await dirname(docUri);
      const absolute = await join(dir, src);
      return convertFileSrc(absolute);
    },
  };
}
