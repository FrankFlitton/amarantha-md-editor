import { describe, expect, it } from "vitest";
import { NodeProp } from "@lezer/common";
import { amaranthaSourceLanguage } from "./language";

describe("amaranthaSourceLanguage", () => {
  it("parses YAML frontmatter as its own region, distinct from the markdown body", () => {
    const doc = ['---', 'title: "Draft"', "status: review", "---", "", "# Heading", ""].join("\n");
    const tree = amaranthaSourceLanguage().language.parser.parse(doc);
    const names = new Set<string>();
    tree.iterate({ enter: (n) => void names.add(n.name) });
    expect(names.has("Frontmatter")).toBe(true);
    expect(names.has("ATXHeading1")).toBe(true);
  });

  it("highlights a fenced ```json code block as real JSON", () => {
    // Fenced code languages mount as a nested tree on the FencedCode node
    // (same NodeProp.mounted mechanism as jsxNestingWrap), not spliced into
    // the outer tree's own iterate() pass — confirmed empirically before
    // writing this assertion, same as jsxNesting.test.ts.
    const doc = ['```json', '{"a": 1}', "```", ""].join("\n");
    const tree = amaranthaSourceLanguage().language.parser.parse(doc);
    const cursor = tree.cursor();
    let mountedJsonNames: string[] | undefined;
    do {
      if (cursor.name === "FencedCode" && cursor.tree) {
        const mounted = cursor.tree.prop(NodeProp.mounted);
        if (mounted) {
          mountedJsonNames = [];
          mounted.tree.iterate({ enter: (n) => void mountedJsonNames?.push(n.name) });
        }
      }
    } while (cursor.next());
    expect(mountedJsonNames).toContain("Object");
    expect(mountedJsonNames).toContain("Property");
  });

  it("leaves an unrecognized fence language (e.g. mermaid) as plain, unhighlighted content", () => {
    const doc = ["```mermaid", "graph TD", "  A --> B", "```", ""].join("\n");
    expect(() => amaranthaSourceLanguage().language.parser.parse(doc)).not.toThrow();
  });
});
