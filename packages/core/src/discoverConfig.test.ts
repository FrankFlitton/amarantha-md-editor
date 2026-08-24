import { describe, expect, it } from "vitest";
import { discoverWorkspaceConfig } from "./discoverConfig";
import type { FsAdapter } from "./config";

/** A tiny in-memory posix-style FsAdapter for testing the discovery walk. */
function fakeFs(files: Record<string, string>): FsAdapter {
  return {
    async exists(path) {
      return path in files;
    },
    async readTextFile(path) {
      const content = files[path];
      if (content === undefined) throw new Error(`not found: ${path}`);
      return content;
    },
    async dirname(path) {
      const parts = path.split("/");
      parts.pop();
      return parts.join("/") || "/";
    },
    async join(...parts) {
      return parts.join("/").replace(/\/+/g, "/");
    },
  };
}

describe("discoverWorkspaceConfig", () => {
  it("returns empty config when no config file exists anywhere", async () => {
    const fs = fakeFs({});
    const result = await discoverWorkspaceConfig("/repo/doc.md", fs);
    expect(result).toEqual({ theme: undefined, componentDefinitions: [], frontmatterFields: {} });
  });

  it("returns empty config for an empty/unsaved document uri", async () => {
    const fs = fakeFs({ "/amarantha.config.json": JSON.stringify({ root: true, theme: "cream" }) });
    const result = await discoverWorkspaceConfig("", fs);
    expect(result).toEqual({ theme: undefined, componentDefinitions: [], frontmatterFields: {} });
  });

  it("microrepo: a single root config applies and stops the walk", async () => {
    const fs = fakeFs({
      "/repo/amarantha.config.json": JSON.stringify({
        root: true,
        theme: "matrix",
        components: [{ name: "Widget", kind: "flow", props: {} }],
      }),
    });
    const result = await discoverWorkspaceConfig("/repo/docs/doc.md", fs);
    expect(result.theme).toBe("matrix");
    expect(result.componentDefinitions.map((d) => d.name)).toEqual(["Widget"]);
  });

  it("monorepo: a nested non-root config overrides theme and merges components with the parent", async () => {
    const fs = fakeFs({
      "/repo/amarantha.config.json": JSON.stringify({
        root: true,
        theme: "solarized",
        components: [
          { name: "Shared", kind: "flow", props: {} },
          { name: "Widget", displayName: "Root Widget", kind: "flow", props: {} },
        ],
      }),
      "/repo/packages/site/amarantha.config.json": JSON.stringify({
        theme: "cream",
        components: [{ name: "Widget", displayName: "Site Widget", kind: "flow", props: {} }],
      }),
    });
    const result = await discoverWorkspaceConfig("/repo/packages/site/docs/doc.md", fs);
    expect(result.theme).toBe("cream");
    const byName = Object.fromEntries(result.componentDefinitions.map((d) => [d.name, d]));
    expect(byName.Shared).toBeDefined();
    expect(byName.Widget.displayName).toBe("Site Widget");
  });

  it("stops walking once it hits a root: true config, ignoring configs further up", async () => {
    const fs = fakeFs({
      "/amarantha.config.json": JSON.stringify({ theme: "matrix" }),
      "/repo/amarantha.config.json": JSON.stringify({ root: true, theme: "ember" }),
    });
    const result = await discoverWorkspaceConfig("/repo/docs/doc.md", fs);
    expect(result.theme).toBe("ember");
  });

  it("resolves imagePrefix relative to the config file's own directory, not the document's", async () => {
    const fs = fakeFs({
      "/repo/amarantha.config.json": JSON.stringify({ root: true, imagePrefix: "src/public" }),
    });
    const result = await discoverWorkspaceConfig("/repo/content/projects/doc.md", fs);
    expect(result.imagePrefix).toBe("src/public");
    expect(result.imagePrefixDir).toBe("/repo");
  });

  it("a closer config's imagePrefix overrides a parent's, same precedence as theme", async () => {
    const fs = fakeFs({
      "/repo/amarantha.config.json": JSON.stringify({ root: true, imagePrefix: "public" }),
      "/repo/packages/site/amarantha.config.json": JSON.stringify({ imagePrefix: "src/public" }),
    });
    const result = await discoverWorkspaceConfig("/repo/packages/site/docs/doc.md", fs);
    expect(result.imagePrefix).toBe("src/public");
    expect(result.imagePrefixDir).toBe("/repo/packages/site");
  });

  it("accumulates and merges declared frontmatter fields the same way as components", async () => {
    const fs = fakeFs({
      "/repo/amarantha.config.json": JSON.stringify({
        root: true,
        frontmatter: {
          title: { type: "string", required: true },
          status: { type: "enum", values: ["draft", "review"] },
        },
      }),
      "/repo/packages/site/amarantha.config.json": JSON.stringify({
        frontmatter: { status: { type: "enum", values: ["draft", "review", "published"] } },
      }),
    });
    const result = await discoverWorkspaceConfig("/repo/packages/site/docs/doc.md", fs);
    expect(Object.keys(result.frontmatterFields)).toEqual(["title", "status"]);
    expect(result.frontmatterFields.status.values).toEqual(["draft", "review", "published"]);
  });
});
