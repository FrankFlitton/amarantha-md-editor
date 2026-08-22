import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-fs", () => fsMocks);

const pathMocks = vi.hoisted(() => ({
  dirname: vi.fn(async (p: string) => p.slice(0, p.lastIndexOf("/"))),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/path", () => pathMocks);

const coreMocks = vi.hoisted(() => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));
vi.mock("@tauri-apps/api/core", () => coreMocks);

import { createImageHandlers, toAssetFileName } from "./imageHost";

// jsdom's File/Blob polyfill doesn't implement arrayBuffer() in this
// version — the real webview does, this is purely a test-env gap.
function makeFile(name: string, type: string, content: string): File {
  const file = new File([content], name, { type });
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode(content).buffer,
    });
  }
  return file;
}

describe("toAssetFileName", () => {
  it("prefixes a base36 timestamp and sanitizes the name", () => {
    expect(toAssetFileName("my photo (1).png", 1000)).toBe("rs-my_photo__1_.png");
  });
});

describe("createImageHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with no docUri (unsaved buffer)", () => {
    const handlers = createImageHandlers(null);

    it("imageUploadHandler inlines the file as a data URL", async () => {
      const file = makeFile("a.png", "image/png", "hello");
      const src = await handlers.imageUploadHandler!(file);
      expect(src.startsWith("data:image/png;base64,")).toBe(true);
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
    });

    it("imagePreviewHandler returns the src unchanged", async () => {
      const src = await handlers.imagePreviewHandler!("assets/a.png");
      expect(src).toBe("assets/a.png");
    });
  });

  describe("with a docUri", () => {
    const docUri = "/repo/content/post.md";
    const handlers = createImageHandlers(docUri);

    it("imageUploadHandler creates the assets dir when missing and writes the file", async () => {
      fsMocks.exists.mockResolvedValue(false);
      const file = makeFile("photo.png", "image/png", "hello");

      const src = await handlers.imageUploadHandler!(file);

      expect(pathMocks.dirname).toHaveBeenCalledWith(docUri);
      expect(fsMocks.mkdir).toHaveBeenCalledWith("/repo/content/assets", { recursive: true });
      expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
      const [destPath, bytes] = fsMocks.writeFile.mock.calls[0];
      expect(destPath).toMatch(/^\/repo\/content\/assets\/[a-z0-9]+-photo\.png$/);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(src).toMatch(/^assets\/[a-z0-9]+-photo\.png$/);
    });

    it("imageUploadHandler skips mkdir when the assets dir already exists", async () => {
      fsMocks.exists.mockResolvedValue(true);
      await handlers.imageUploadHandler!(makeFile("b.png", "image/png", "x"));
      expect(fsMocks.mkdir).not.toHaveBeenCalled();
    });

    it("imagePreviewHandler passes remote/data urls through untouched", async () => {
      const src = await handlers.imagePreviewHandler!("https://example.com/a.png");
      expect(src).toBe("https://example.com/a.png");
      expect(pathMocks.dirname).not.toHaveBeenCalled();
    });

    it("imagePreviewHandler resolves a local relative path via convertFileSrc", async () => {
      const src = await handlers.imagePreviewHandler!("assets/a.png");
      expect(pathMocks.dirname).toHaveBeenCalledWith(docUri);
      expect(pathMocks.join).toHaveBeenCalledWith("/repo/content", "assets/a.png");
      expect(coreMocks.convertFileSrc).toHaveBeenCalledWith("/repo/content/assets/a.png");
      expect(src).toBe("asset://localhost//repo/content/assets/a.png");
    });
  });
});
