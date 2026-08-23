import type { ComponentDefinition, FrontmatterFieldDefinition } from "./types";

/**
 * Merges two component-definition arrays keyed by `name`: entries in
 * `override` replace same-name entries in `base`, everything else from both
 * sides is kept. Order: base entries first (in their original order, with
 * overridden ones swapped in place), then any override-only entries appended.
 */
export function mergeComponentDefinitions(
  base: readonly ComponentDefinition[],
  override: readonly ComponentDefinition[]
): ComponentDefinition[] {
  const overrideByName = new Map(override.map((definition) => [definition.name, definition]));
  const seen = new Set<string>();

  const merged = base.map((definition) => {
    seen.add(definition.name);
    return overrideByName.get(definition.name) ?? definition;
  });

  for (const definition of override) {
    if (!seen.has(definition.name)) {
      merged.push(definition);
    }
  }

  return merged;
}

/** Shallow per-key override merge: keys in `override` replace same-name keys in `base`. */
export function mergeFrontmatterFields(
  base: Record<string, FrontmatterFieldDefinition>,
  override: Record<string, FrontmatterFieldDefinition>
): Record<string, FrontmatterFieldDefinition> {
  return { ...base, ...override };
}
