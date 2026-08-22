import { describe, expect, it } from "vitest";
import { personalWebsiteRegistry } from "./personalWebsiteComponents";

describe("personalWebsiteRegistry", () => {
  it("registers all 8 components observed in the content repo", () => {
    const names = personalWebsiteRegistry.list?.().map((d) => d.name) ?? [];
    expect(names).toEqual([
      "YouTube",
      "IFrame",
      "Img",
      "Gist",
      "NPM",
      "Mermaid",
      "UserJourney",
      "UserJourneyMap",
    ]);
  });

  it("marks YouTube's id prop as required string", () => {
    const youtube = personalWebsiteRegistry.resolve("YouTube");
    expect(youtube?.props.id).toEqual({
      type: "string",
      required: true,
      description: "YouTube video ID",
    });
  });

  it("marks Img's framed/tall props as boolean", () => {
    const img = personalWebsiteRegistry.resolve("Img");
    expect(img?.props.framed.type).toBe("boolean");
    expect(img?.props.tall.type).toBe("boolean");
  });

  it("marks Mermaid's chart prop as expression", () => {
    const mermaid = personalWebsiteRegistry.resolve("Mermaid");
    expect(mermaid?.props.chart.type).toBe("expression");
  });
});
