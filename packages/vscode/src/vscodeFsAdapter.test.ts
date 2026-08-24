import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { discoverWorkspaceConfig } from "@amarantha/core";
import { vscodeFsAdapter } from "./vscodeFsAdapter";

describe("vscodeFsAdapter", () => {
  it("implements exists/readTextFile/dirname/join against the real filesystem", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "amarantha-vscode-fs-"));
    try {
      const filePath = path.join(dir, "note.md");
      await fs.writeFile(filePath, "# hello");

      expect(await vscodeFsAdapter.exists(filePath)).toBe(true);
      expect(await vscodeFsAdapter.exists(path.join(dir, "missing.md"))).toBe(false);
      expect(await vscodeFsAdapter.readTextFile(filePath)).toBe("# hello");
      expect(await vscodeFsAdapter.dirname(filePath)).toBe(dir);
      expect(await vscodeFsAdapter.join(dir, "assets", "img.png")).toBe(path.join(dir, "assets", "img.png"));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("works end-to-end with discoverWorkspaceConfig (real amarantha.config.json on disk)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "amarantha-vscode-config-"));
    try {
      await fs.writeFile(
        path.join(dir, "amarantha.config.json"),
        JSON.stringify({ root: true, components: [{ name: "Note", kind: "flow", props: {} }] })
      );
      const docPath = path.join(dir, "doc.md");
      await fs.writeFile(docPath, "hello");

      const result = await discoverWorkspaceConfig(docPath, vscodeFsAdapter);
      expect(result.componentDefinitions).toEqual([{ name: "Note", kind: "flow", props: {} }]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
