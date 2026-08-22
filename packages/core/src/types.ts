import type { ThemeFamily } from "./theme";

export type DocumentUri = string;

export interface LoadedDocument {
  uri: DocumentUri;
  text: string;
  revision: string;
  encoding?: string;
  lineEnding?: "lf" | "crlf";
}

export interface WriteRequest {
  uri: DocumentUri;
  baseRevision: string;
  text: string;
  reason: "save" | "format" | "explicit-transform";
}

export type WriteResult =
  | { ok: true; revision: string }
  | {
      ok: false;
      reason: "conflict" | "permission" | "io";
      current?: LoadedDocument;
    };

export interface Disposable {
  dispose(): void;
}

// Stub for a future external-change/conflict-reconciliation feature (RFC Milestone 4).
export interface ExternalChange {
  uri: DocumentUri;
  revision: string;
}

// Stub for a future desktop/VS Code workspace-trust model.
export interface WorkspaceTrust {
  trusted: boolean;
}

// Declarative per-repository JSX component registry (RFC Milestone 3, @amarantha/mdx).
// Kept here, not in @amarantha/mdx, so @amarantha/editor can accept a
// ComponentRegistry without depending on the (repo-config-loading) mdx package.
export type ComponentPropType = "string" | "number" | "boolean" | "enum" | "expression";

export interface ComponentPropDefinition {
  type: ComponentPropType;
  required?: boolean;
  /** Allowed values, for type "enum". */
  values?: readonly string[];
  description?: string;
}

export interface ComponentDefinition {
  name: string;
  displayName?: string;
  /** Block ("flow") vs inline ("text") JSX element — matches MDXEditor's JsxComponentDescriptor.kind. */
  kind: "flow" | "text";
  props: Record<string, ComponentPropDefinition>;
  children?: "none" | "markdown" | "mdx" | "opaque";
}

export interface ComponentRegistry {
  resolve(name: string): ComponentDefinition | undefined;
  list?(): readonly ComponentDefinition[];
}

export interface WorkspaceHostConfig {
  theme?: ThemeFamily;
  componentRegistry: ComponentRegistry;
}

/**
 * Contract a host (desktop, VS Code, ...) implements to give the shared
 * editor engine file access. Only readDocument/writeDocument are expected
 * to be functionally real in v0 hosts; the rest are stubs future hosts
 * implement against the same shape.
 */
export interface EditorHost {
  readonly kind: "desktop" | "vscode" | string;
  readDocument(uri: DocumentUri): Promise<LoadedDocument>;
  writeDocument(request: WriteRequest): Promise<WriteResult>;
  watchDocument(
    uri: DocumentUri,
    onChange: (event: ExternalChange) => void
  ): Disposable;
  getWorkspaceTrust(): Promise<WorkspaceTrust>;
  /** Resolves the nearest `amarantha.config.json` chain for `uri` (RFC Milestone 3). */
  resolveWorkspaceConfig(uri: DocumentUri): Promise<WorkspaceHostConfig>;
}
