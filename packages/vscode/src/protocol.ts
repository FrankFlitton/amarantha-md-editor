import type { ComponentDefinition, FrontmatterFieldDefinition, FontPreference, FontSlot, ProseSize } from "@amarantha/core";

// A local literal type rather than importing EditorMode from @amarantha/editor:
// that package pulls in React/MDXEditor/CodeMirror/Lexical, which the
// extension-host bundle (esbuild.extension.mjs, Node target) has no reason
// to know about for what's just a two-value string union here.
export type EditorMode = "rich" | "source";

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
  | { type: "requestFailed"; requestId: number; error: string }
  | { type: "applyMode"; mode: EditorMode }
  | { type: "applyFrontmatterHidden"; hidden: boolean }
  | { type: "applyProseSize"; size: ProseSize }
  | { type: "applyFont"; slot: FontSlot; preference: FontPreference };

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
  | { type: "requestFont"; requestId: number; slot: FontSlot; preference: FontPreference }
  | {
      type: "stateChanged";
      mode: EditorMode;
      frontmatterHidden: boolean;
      proseSize: ProseSize;
      sansFont: FontPreference;
      headingFont: FontPreference;
      monoFont: FontPreference;
    };
