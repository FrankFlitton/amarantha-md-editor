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
  FrontmatterFieldType,
  FrontmatterFieldDefinition,
  WorkspaceHostConfig,
  EditorHost,
} from "./types";

export { detectLineEnding, hashText, toLoadedDocument, hasFrontmatterBlock } from "./document";
export { reconcileMarkdown } from "./reconcile";
export { arrayBufferToBase64, isRemoteOrDataUrl, sanitizeAssetFileName } from "./media";
export type { ThemeFamily, ThemeMode, ThemeId, ThemeModePreference, ProseSize } from "./theme";
export type { FontSlot, FontSourceKind, FontPreference } from "./fonts";
export { DEFAULT_FONT_PREFERENCE } from "./fonts";
export type { AmaranthaConfig, FsAdapter, WorkspaceConfig } from "./config";
export { mergeComponentDefinitions, mergeFrontmatterFields } from "./registryMerge";
export { discoverWorkspaceConfig } from "./discoverConfig";
export type { FrontmatterEntry } from "./frontmatter";
export {
  listFrontmatterKeys,
  readFrontmatterEntries,
  setFrontmatterValue,
  appendFrontmatterEntry,
  setFrontmatterArrayItem,
  appendFrontmatterArrayItem,
  renameFrontmatterKey,
} from "./frontmatter";
