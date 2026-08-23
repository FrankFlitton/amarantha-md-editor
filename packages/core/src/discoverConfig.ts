import type { AmaranthaConfig, FsAdapter, WorkspaceConfig } from "./config";
import { mergeComponentDefinitions, mergeFrontmatterFields } from "./registryMerge";
import type { DocumentUri } from "./types";

const CONFIG_FILE_NAME = "amarantha.config.json";
const MAX_ANCESTORS = 50;

/**
 * Walks upward from `docUri`'s directory looking for `amarantha.config.json`
 * at every ancestor, stopping at the first `root: true` config, the
 * filesystem root, or a hard iteration cap (whichever comes first — the cap
 * exists so a config-less tree can never silently walk all the way to
 * $HOME). Configs are folded root-most-first so a config closer to the
 * document always wins: its `theme` overrides an ancestor's, and its
 * `components` override same-name ancestor components via
 * `mergeComponentDefinitions`.
 */
export async function discoverWorkspaceConfig(docUri: DocumentUri, fs: FsAdapter): Promise<WorkspaceConfig> {
  if (!docUri) {
    return { theme: undefined, componentDefinitions: [], frontmatterFields: {} };
  }

  const found: AmaranthaConfig[] = [];
  let dir = await fs.dirname(docUri);

  for (let i = 0; i < MAX_ANCESTORS; i++) {
    const configPath = await fs.join(dir, CONFIG_FILE_NAME);
    if (await fs.exists(configPath)) {
      const config = JSON.parse(await fs.readTextFile(configPath)) as AmaranthaConfig;
      found.push(config);
      if (config.root) break;
    }

    const parent = await fs.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  found.reverse(); // root-most first = lowest precedence

  let theme: WorkspaceConfig["theme"];
  let componentDefinitions: ComponentDefinitionsAccumulator = [];
  let frontmatterFields: WorkspaceConfig["frontmatterFields"] = {};
  for (const config of found) {
    if (config.theme !== undefined) theme = config.theme;
    componentDefinitions = mergeComponentDefinitions(componentDefinitions, config.components ?? []);
    frontmatterFields = mergeFrontmatterFields(frontmatterFields, config.frontmatter ?? {});
  }

  return { theme, componentDefinitions, frontmatterFields };
}

type ComponentDefinitionsAccumulator = WorkspaceConfig["componentDefinitions"];
