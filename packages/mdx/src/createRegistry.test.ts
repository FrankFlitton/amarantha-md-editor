import { describe, expect, it } from "vitest";
import type { ComponentDefinition } from "@amarantha/core";
import { createRegistry } from "./createRegistry";

const definitions: ComponentDefinition[] = [
  { name: "YouTube", kind: "flow", props: { id: { type: "string", required: true } } },
  { name: "Gist", kind: "flow", props: { id: { type: "string", required: true } } },
];

describe("createRegistry", () => {
  it("resolves a known component by name", () => {
    const registry = createRegistry(definitions);
    expect(registry.resolve("YouTube")).toEqual(definitions[0]);
  });

  it("resolves undefined for an unknown component", () => {
    const registry = createRegistry(definitions);
    expect(registry.resolve("NopeComponent")).toBeUndefined();
  });

  it("lists all definitions", () => {
    const registry = createRegistry(definitions);
    expect(registry.list?.()).toEqual(definitions);
  });
});
