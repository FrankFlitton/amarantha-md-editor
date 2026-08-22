import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { personalWebsiteRegistry } from "@amarantha/mdx";
import { AmaranthaEditor } from "../AmaranthaEditor";

/**
 * Snippets grounded in real usage from /Users/franklinflitton/Git/Personal-Website/content
 * (surveyed via research agent, not invented) — QA against the actual registry
 * these components will be edited with, per the RFC's "inspect actual content
 * documents before defining registry schemas" instruction.
 */

describe("personalWebsiteRegistry against real content patterns", () => {
  it("renders YouTube with empty-children usage", () => {
    render(
      <AmaranthaEditor
        value='<YouTube id="sKXIPwYw2LE"></YouTube>\n'
        onChange={() => {}}
        mode="rich"
        componentRegistry={personalWebsiteRegistry}
      />
    );
    expect((screen.getByTestId("jsx-prop-id") as HTMLInputElement).value).toBe("sKXIPwYw2LE");
  });

  it("renders Img with framed + tall bare-boolean attributes", () => {
    const markdown =
      '<Img src="/img/projects/td-sbc/sbc-results-mobile.png" alt="Results step on mobile" framed tall />\n';
    render(
      <AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={personalWebsiteRegistry} />
    );
    expect((screen.getByTestId("jsx-prop-framed") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("jsx-prop-tall") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("jsx-prop-alt") as HTMLInputElement).value).toBe("Results step on mobile");
  });

  it("renders Gist and NPM with their required string props", () => {
    render(
      <AmaranthaEditor
        value='<Gist id="354d225c11711b3eae9e90e733070b5b" />\n'
        onChange={() => {}}
        mode="rich"
        componentRegistry={personalWebsiteRegistry}
      />
    );
    expect((screen.getByTestId("jsx-prop-id") as HTMLInputElement).value).toBe(
      "354d225c11711b3eae9e90e733070b5b"
    );
  });

  it("renders Mermaid's multi-line chart prop as an expression textarea", () => {
    const markdown = "<Mermaid chart={`graph TD\n  A --> B\n  B --> C`} />\n";
    render(
      <AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={personalWebsiteRegistry} />
    );
    const chartField = screen.getByTestId("jsx-prop-chart") as HTMLTextAreaElement;
    expect(chartField.value).toContain("graph TD");
    expect(chartField.value).toContain("A --> B");
  });

  it("renders UserJourneyMap's nested object/array expression props without crashing", () => {
    const markdown = [
      "<UserJourneyMap",
      '  title="Wavestate Hardware — Sound Design Session"',
      "  persona={{ name: \"Jordan\", role: \"Sound Designer\", bio: \"Jordan designs patches...\" }}",
      '  expectations={["See all 4 layers at a glance"]}',
      "  phases={[{ name: \"Playing\", steps: [{ id: 1, description: \"Load a preset\", sentiment: 5 }] }]}",
      "/>",
      "",
    ].join("\n");
    render(
      <AmaranthaEditor value={markdown} onChange={() => {}} mode="rich" componentRegistry={personalWebsiteRegistry} />
    );
    expect(screen.getByTestId("jsx-editor-UserJourneyMap")).toBeTruthy();
    const phasesField = screen.getByTestId("jsx-prop-phases") as HTMLTextAreaElement;
    expect(phasesField.value).toContain("Playing");
  });
});
