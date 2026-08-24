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
  /**
   * A directory, relative to this config file, to also try when a markdown
   * image src doesn't resolve relative to the document itself. Covers
   * Jamstack-style repos where content and public assets live in separate
   * trees — e.g. markdown under `content/` references `/img/foo.png`, but
   * the file actually lives at `<repo>/src/public/img/foo.png`; setting
   * `"imagePrefix": "src/public"` lets image preview find it there once the
   * usual document-relative resolution fails.
   */
  imagePrefix?: string;
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
  imagePrefix?: string;
  /** Absolute directory `imagePrefix` is relative to — the directory of
   *  whichever config file actually set it (closest-to-document wins, same
   *  precedence as `theme`), not necessarily the document's own directory. */
  imagePrefixDir?: string;
}
