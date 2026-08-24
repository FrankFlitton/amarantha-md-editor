import { describe, expect, it } from "vitest";
import { NodeProp } from "@lezer/common";
import { markdown } from "@codemirror/lang-markdown";
import { jsxNestingWrap, scanJsxTagEnd } from "./jsxNesting";

describe("scanJsxTagEnd", () => {
  it("finds the self-closing tag end past a multi-line nested object/array expression", () => {
    const text = [
      "<UserJourneyMap",
      '  title="Wavestate Hardware — Sound Design Session"',
      "  persona={{",
      '    name: "Jordan",',
      '    role: "Sound Designer",',
      "  }}",
      "  phases={[",
      '    { name: "Playing", steps: [{ id: 1, description: "Load a preset", sentiment: 5 }] }',
      "  ]}",
      "/>",
    ].join("\n");
    const end = scanJsxTagEnd(text, 0);
    expect(end).not.toBeNull();
    expect(text.slice(0, end ?? 0)).toBe(text);
  });

  it("isn't confused by a template-literal string containing newlines and '>' (Mermaid's chart prop)", () => {
    const text = "<Mermaid chart={`graph TD\n  A --> B`} title=\"Demo\" />";
    const end = scanJsxTagEnd(text, 0);
    expect(text.slice(0, end ?? 0)).toBe(text);
  });

  it("finds a simple single-line self-closing tag", () => {
    const text = '<YouTube id="dQw4w9WgXcQ" />';
    expect(scanJsxTagEnd(text, 0)).toBe(text.length);
  });

  it("returns null for an unterminated tag rather than guessing", () => {
    const text = '<Img src="/a.png"';
    expect(scanJsxTagEnd(text, 0)).toBeNull();
  });
});

describe("jsxNestingWrap (real @codemirror/lang-markdown integration)", () => {
  const lang = markdown({ extensions: [{ wrap: jsxNestingWrap }] });

  it("attaches a real JS/JSX parse to a Paragraph starting with a capitalized component tag", () => {
    const sample = [
      "# Heading",
      "",
      "<UserJourneyMap",
      '  title="Wavestate Hardware"',
      '  persona={{ name: "Jordan", role: "Sound Designer" }}',
      '  phases={[{ name: "Playing", steps: [{ id: 1, sentiment: 5 }] }]}',
      "/>",
      "",
      "Some prose after.",
    ].join("\n");

    const tree = lang.language.parser.parse(sample);
    const cursor = tree.cursor();
    const mountedRanges: { from: number; to: number; nodeNames: string[] }[] = [];
    do {
      if (cursor.name === "Paragraph" && cursor.tree) {
        const mounted = cursor.tree.prop(NodeProp.mounted);
        if (mounted) {
          const names: string[] = [];
          mounted.tree.iterate({ enter: (n) => void names.push(n.name) });
          mountedRanges.push({ from: cursor.from, to: cursor.to, nodeNames: names });
        }
      }
    } while (cursor.next());

    expect(mountedRanges).toHaveLength(1);
    expect(mountedRanges[0].nodeNames).toContain("JSXAttribute");
    expect(mountedRanges[0].nodeNames).toContain("ObjectExpression");
    expect(mountedRanges[0].nodeNames).toContain("ArrayExpression");
    expect(mountedRanges[0].nodeNames).toContain("String");
    expect(mountedRanges[0].nodeNames).toContain("Number");
  });

  it("does not attach a JSX parse to a plain prose paragraph", () => {
    const tree = lang.language.parser.parse("Just a normal paragraph, nothing special.\n");
    const cursor = tree.cursor();
    let mountedCount = 0;
    do {
      if (cursor.name === "Paragraph" && cursor.tree && cursor.tree.prop(NodeProp.mounted)) mountedCount++;
    } while (cursor.next());
    expect(mountedCount).toBe(0);
  });

  it("does not misfire on a lowercase-tag literal HTML element", () => {
    const tree = lang.language.parser.parse('<div class="x">hi</div>\n');
    const cursor = tree.cursor();
    let mountedCount = 0;
    do {
      if (cursor.name === "Paragraph" && cursor.tree && cursor.tree.prop(NodeProp.mounted)) mountedCount++;
    } while (cursor.next());
    expect(mountedCount).toBe(0);
  });
});
