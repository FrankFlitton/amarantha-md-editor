import type { ComponentDefinition, FrontmatterFieldDefinition } from "./types";
import type { ThemeFamily } from "./theme";

/**
 * The shape of a repository's `amarantha.config.json`. JSON-only for v0 —
 * no `.ts`/executable config — per the RFC's stance of never auto-executing
 * repository code without an explicit workspace-trust gate.
 */
export interface AmaranthaConfig {
  /** Stop upward discovery at this file (ESLint-style), even short of the filesystem root. */
  root?: boolean;
  /** A palette opinion only — never pins light/dark mode, that stays a separate user preference. */
  theme?: ThemeFamily;
  components?: ComponentDefinition[];
  /** Declares known frontmatter fields for this repo (RFC: not mandatory for every document). */
  frontmatter?: Record<string, FrontmatterFieldDefinition>;
}

/** Minimal filesystem contract the discovery algorithm needs, so it can run against
 *  either real Tauri fs calls or an in-memory fake in tests. */
export interface FsAdapter {
  exists(path: string): Promise<boolean>;
  readTextFile(path: string): Promise<string>;
  dirname(path: string): Promise<string>;
  join(...parts: string[]): Promise<string>;
}

export interface WorkspaceConfig {
  theme?: ThemeFamily;
  componentDefinitions: ComponentDefinition[];
  frontmatterFields: Record<string, FrontmatterFieldDefinition>;
}
