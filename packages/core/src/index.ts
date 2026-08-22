export type {
  DocumentUri,
  LoadedDocument,
  WriteRequest,
  WriteResult,
  Disposable,
  ExternalChange,
  WorkspaceTrust,
  ComponentPropType,
  ComponentPropDefinition,
  ComponentDefinition,
  ComponentRegistry,
  WorkspaceHostConfig,
  EditorHost,
} from "./types";

export { detectLineEnding, hashText, toLoadedDocument } from "./document";
export { arrayBufferToBase64, isRemoteOrDataUrl, sanitizeAssetFileName } from "./media";
export type { ThemeFamily, ThemeMode, ThemeId, ThemeModePreference, ProseSize } from "./theme";
export type { FontSlot, FontSourceKind, FontPreference } from "./fonts";
export { DEFAULT_FONT_PREFERENCE } from "./fonts";
export type { AmaranthaConfig, FsAdapter, WorkspaceConfig } from "./config";
export { mergeComponentDefinitions } from "./registryMerge";
export { discoverWorkspaceConfig } from "./discoverConfig";
