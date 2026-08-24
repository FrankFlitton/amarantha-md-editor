import { discoverWorkspaceConfig, type ComponentDefinition, type FrontmatterFieldDefinition } from "@amarantha/core";
import { vscodeFsAdapter } from "./vscodeFsAdapter";

export interface ResolvedWorkspaceConfig {
  componentDefinitions: ComponentDefinition[];
  frontmatterFields: Record<string, FrontmatterFieldDefinition>;
}

/**
 * Resolves the nearest amarantha.config.json chain for `uri`. Unlike
 * desktopHost.resolveWorkspaceConfig, this deliberately drops the config's
 * `theme` field: the VS Code host inherits the user's active VS Code color
 * theme instead of offering a repo-opinionated palette (see
 * vscode-theme-adapter.css) — no ComponentRegistry is built here either
 * (that's the webview's job, via @amarantha/mdx's createRegistry, once the
 * plain definitions arrive over the init message) since a ComponentRegistry
 * isn't serializable across the extension/webview postMessage boundary.
 */
export async function resolveWorkspaceConfig(uri: string): Promise<ResolvedWorkspaceConfig> {
  const { componentDefinitions, frontmatterFields } = await discoverWorkspaceConfig(uri, vscodeFsAdapter);
  return { componentDefinitions, frontmatterFields };
}
