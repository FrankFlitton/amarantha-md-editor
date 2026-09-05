import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(__dirname, "amarantha.config.schema.json"), "utf-8"));

// Guards against the schema silently drifting from AmaranthaConfig
// (packages/core/src/config.ts) and ComponentDefinition/FrontmatterFieldDefinition
// (packages/core/src/types.ts) — there's no codegen link between the TS types
// and this hand-written schema, so this is the only thing that would catch it.
describe("amarantha.config.schema.json", () => {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  it("compiles as a valid JSON Schema", () => {
    expect(validate).toBeTypeOf("function");
  });

  it("is wired up in the extension's jsonValidation contribution", () => {
    const entries = packageJson.contributes.jsonValidation;
    expect(entries).toContainEqual({
      fileMatch: "amarantha.config.json",
      url: "./schemas/amarantha.config.schema.json",
    });
  });

  it("accepts an empty config", () => {
    expect(validate({})).toBe(true);
  });

  it("accepts a config using every field", () => {
    const valid = {
      root: true,
      theme: "solarized",
      imagePrefix: "src/public",
      components: [
        {
          name: "Callout",
          displayName: "Callout box",
          kind: "flow",
          children: "markdown",
          props: {
            variant: { type: "enum", values: ["info", "warning"], required: true },
            title: { type: "string", description: "Optional heading" },
          },
        },
      ],
      frontmatter: {
        status: { type: "enum", values: ["draft", "published"], required: true },
        publishedAt: { type: "string" },
      },
    };
    expect(validate(valid)).toBe(true);
  });

  it("rejects an unknown top-level field (catches typos)", () => {
    expect(validate({ them: "ember" })).toBe(false);
  });

  it("rejects a theme outside the known theme families", () => {
    expect(validate({ theme: "sepia" })).toBe(false);
  });

  it("rejects a component missing its required kind/props", () => {
    expect(validate({ components: [{ name: "Callout" }] })).toBe(false);
  });

  it("rejects a frontmatter field with an unknown type", () => {
    expect(validate({ frontmatter: { status: { type: "date" } } })).toBe(false);
  });
});
