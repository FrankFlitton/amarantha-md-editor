import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  exists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  watch: vi.fn(),
  rename: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-fs", () => fsMocks);

const pathMocks = vi.hoisted(() => ({
  dirname: vi.fn(async (p: string) => p.slice(0, p.lastIndexOf("/"))),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/path", () => pathMocks);

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("@amarantha/mdx", () => ({ createRegistry: vi.fn() }));
vi.mock("./tauriFsAdapter", () => ({ tauriFsAdapter: {} }));

import { hashText } from "@amarantha/core";
import { desktopHost } from "./desktopHost";

/** Lets the promise chains inside writeDocument/watchDocument settle. */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("desktopHost.writeDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a brand-new document (no baseline, nothing on disk) without a conflict check", async () => {
    fsMocks.exists.mockResolvedValue(false);
    const result = await desktopHost.writeDocument({
      uri: "/repo/note.md",
      baseRevision: "",
      text: "hello",
      reason: "save",
    });
    expect(result).toEqual({ ok: true, revision: hashText("hello") });
    expect(fsMocks.writeTextFile).toHaveBeenCalledWith("/repo/note.md", "hello");
    expect(fsMocks.readTextFile).not.toHaveBeenCalled();
  });

  it("writes successfully when baseRevision matches the current on-disk content", async () => {
    fsMocks.exists.mockResolvedValue(true);
    fsMocks.readTextFile.mockResolvedValue("original");
    const result = await desktopHost.writeDocument({
      uri: "/repo/note.md",
      baseRevision: hashText("original"),
      text: "edited",
      reason: "save",
    });
    expect(result).toEqual({ ok: true, revision: hashText("edited") });
    expect(fsMocks.writeTextFile).toHaveBeenCalledWith("/repo/note.md", "edited");
  });

  it("refuses to overwrite and returns the current content when the disk changed since baseRevision", async () => {
    fsMocks.exists.mockResolvedValue(true);
    fsMocks.readTextFile.mockResolvedValue("someone else's edit");
    const result = await desktopHost.writeDocument({
      uri: "/repo/note.md",
      baseRevision: hashText("original"),
      text: "my edit",
      reason: "save",
    });
    expect(result).toEqual({
      ok: false,
      reason: "conflict",
      current: {
        uri: "/repo/note.md",
        text: "someone else's edit",
        revision: hashText("someone else's edit"),
        lineEnding: "lf",
      },
    });
    expect(fsMocks.writeTextFile).not.toHaveBeenCalled();
  });

  it("returns an io failure when the write itself throws", async () => {
    fsMocks.exists.mockResolvedValue(false);
    fsMocks.writeTextFile.mockRejectedValue(new Error("disk full"));
    const result = await desktopHost.writeDocument({
      uri: "/repo/note.md",
      baseRevision: "",
      text: "hello",
      reason: "save",
    });
    expect(result).toEqual({ ok: false, reason: "io" });
  });
});

describe("desktopHost.watchDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suppresses an event that reflects a revision this host already knows about (its own write)", async () => {
    let watchCallback: (() => void) | undefined;
    fsMocks.watch.mockImplementation((_uri: string, cb: () => void) => {
      watchCallback = cb;
      return Promise.resolve(() => {});
    });
    fsMocks.readTextFile.mockResolvedValue("initial");
    await desktopHost.readDocument("/repo/note.md"); // seeds the known-revision map

    const onChange = vi.fn();
    desktopHost.watchDocument("/repo/note.md", onChange);
    await flush();

    watchCallback?.(); // disk content ("initial") is unchanged from what's known
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("fires onChange with the new text/revision for a genuine external change", async () => {
    let watchCallback: (() => void) | undefined;
    fsMocks.watch.mockImplementation((_uri: string, cb: () => void) => {
      watchCallback = cb;
      return Promise.resolve(() => {});
    });
    fsMocks.readTextFile.mockResolvedValue("initial");
    await desktopHost.readDocument("/repo/note.md");

    const onChange = vi.fn();
    desktopHost.watchDocument("/repo/note.md", onChange);
    await flush();

    fsMocks.readTextFile.mockResolvedValue("changed elsewhere");
    watchCallback?.();
    await flush();

    expect(onChange).toHaveBeenCalledWith({
      uri: "/repo/note.md",
      revision: hashText("changed elsewhere"),
      text: "changed elsewhere",
    });
  });

  it("dispose() calls the underlying unwatch function once the watch subscription resolves", async () => {
    const unwatch = vi.fn();
    fsMocks.watch.mockResolvedValue(unwatch);
    const disposable = desktopHost.watchDocument("/repo/note.md", vi.fn());
    await flush();
    disposable.dispose();
    expect(unwatch).toHaveBeenCalled();
  });
});
