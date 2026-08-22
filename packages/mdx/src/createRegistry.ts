import type { ComponentDefinition, ComponentRegistry } from "@amarantha/core";

/** Builds a ComponentRegistry from a flat list of component definitions. */
export function createRegistry(definitions: readonly ComponentDefinition[]): ComponentRegistry {
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  return {
    resolve(name: string) {
      return byName.get(name);
    },
    list() {
      return definitions;
    },
  };
}
