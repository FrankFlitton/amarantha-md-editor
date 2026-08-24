import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const vscodeMocks = vi.hoisted(() => {
  class Uri {
    private constructor(public fsPath: string) {}
    static file(fsPath: string) {
      return new Uri(fsPath);
    }
    toString() {
      return `file://${this.fsPath}`;
    }
  }
  return { Uri };
});
vi.mock("vscode", () => vscodeMocks);

import { resolveImagePreviewSrc } from "./imageHost";

function fakeWebview() {
  return {
    asWebviewUri: (uri: { fsPath: string }) => ({ toString: () => `vscode-webview://${uri.fsPath}` }),
  };
}

describe("resolveImagePreviewSrc", () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "amarantha-image-prefix-"));
  });

  it("passes remote/data URLs through untouched", async () => {
    const result = await resolveImagePreviewSrc("/repo/content/doc.md", "https://example.com/a.png", fakeWebview() as never);
    expect(result).toBe("https://example.com/a.png");
  });

  it("resolves relative to the document's own directory when that file exists (no imagePrefix needed)", async () => {
    const docDir = path.join(repoDir, "content");
    await fs.mkdir(docDir, { recursive: true });
    await fs.writeFile(path.join(docDir, "photo.png"), "x");

    const result = await resolveImagePreviewSrc(path.join(docDir, "doc.md"), "photo.png", fakeWebview() as never);
    expect(result).toBe(`vscode-webview://${path.join(docDir, "photo.png")}`);
  });

  it("falls back to the imagePrefix candidate when the doc-relative path doesn't exist (the Jamstack case)", async () => {
    const docDir = path.join(repoDir, "content", "projects");
    const publicDir = path.join(repoDir, "src", "public", "img", "projects", "korg-wavestate");
    await fs.mkdir(docDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, "hardware-angle.png"), "x");

    const result = await resolveImagePreviewSrc(
      path.join(docDir, "1-korg-wavestate.md"),
      "/img/projects/korg-wavestate/hardware-angle.png",
      fakeWebview() as never,
      { imagePrefix: "src/public", imagePrefixDir: repoDir }
    );
    expect(result).toBe(`vscode-webview://${path.join(publicDir, "hardware-angle.png")}`);
  });

  it("falls back to the doc-relative candidate when neither location has the file, rather than throwing", async () => {
    const result = await resolveImagePreviewSrc("/repo/content/doc.md", "/img/missing.png", fakeWebview() as never, {
      imagePrefix: "src/public",
      imagePrefixDir: "/repo",
    });
    expect(result).toBe(`vscode-webview://${path.resolve("/repo/content", "/img/missing.png")}`);
  });
});
