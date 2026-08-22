import { describe, expect, it } from "vitest";
import { mergeComponentDefinitions } from "./registryMerge";
import type { ComponentDefinition } from "./types";

function def(name: string, displayName?: string): ComponentDefinition {
  return { name, displayName, kind: "flow", props: {} };
}

describe("mergeComponentDefinitions", () => {
  it("keeps base entries untouched when override is empty", () => {
    const base = [def("A"), def("B")];
    expect(mergeComponentDefinitions(base, [])).toEqual(base);
  });

  it("appends override-only entries", () => {
    const base = [def("A")];
    const override = [def("B")];
    expect(mergeComponentDefinitions(base, override).map((d) => d.name)).toEqual(["A", "B"]);
  });

  it("replaces same-name base entries with the override definition, in place", () => {
    const base = [def("A", "Old A"), def("B")];
    const override = [def("A", "New A")];
    const merged = mergeComponentDefinitions(base, override);
    expect(merged.map((d) => d.name)).toEqual(["A", "B"]);
    expect(merged[0].displayName).toBe("New A");
  });
});
