import type { ComponentDefinition, FrontmatterFieldDefinition, FontPreference, FontSlot } from "@amarantha/core";

/**
 * Extension-host -> webview messages. `init` seeds the freshly-mounted
 * webview; `externalUpdate` is only ever sent for genuinely external changes
 * (undo, another panel, a disk/git change) — the extension suppresses this
 * for the echo of the webview's own edits (see AmaranthaEditorProvider's
 * lastKnownWebviewText tracking), so the webview never remounts/loses cursor
 * position while the user is simply typing.
 */
export type HostMessage =
  | {
      type: "init";
      uri: string;
      text: string;
      componentDefinitions: ComponentDefinition[];
      frontmatterFields: Record<string, FrontmatterFieldDefinition>;
    }
  | { type: "externalUpdate"; text: string }
  | { type: "imageUploadResolved"; requestId: number; src: string }
  | { type: "imagePreviewResolved"; requestId: number; src: string }
  | { type: "fontResolved"; requestId: number; family: string; fontFaceCss?: string }
  | { type: "requestFailed"; requestId: number; error: string };

/**
 * Webview -> extension-host messages. `edit` is sent debounced, on every
 * settled change to MDXEditor's `getMarkdown()` output; the extension
 * reconciles it against the live vscode.TextDocument before writing it back
 * via a WorkspaceEdit (see reconcileMarkdown in @amarantha/core), so native
 * undo/redo/save/dirty-state all come from VS Code's own document lifecycle
 * rather than a competing one.
 */
export type WebviewMessage =
  | { type: "ready" }
  | { type: "edit"; text: string }
  | { type: "requestImageUpload"; requestId: number; name: string; mimeType: string; dataBase64: string }
  | { type: "requestImagePreview"; requestId: number; src: string }
  | { type: "requestFont"; requestId: number; slot: FontSlot; preference: FontPreference };
