import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentRegistry, ExternalChange, LoadedDocument, WriteResult } from "@amarantha/core";
import { createDocumentStore, type DocumentStoreDeps } from "./documentStore";

const registry: ComponentRegistry = { resolve: () => undefined };

function makeDeps(overrides: Partial<DocumentStoreDeps> = {}): DocumentStoreDeps {
  const { host: hostOverrides, ...rest } = overrides;
  return {
    pickFileToOpen: vi.fn(),
    pickFileToSaveAs: vi.fn(),
    renameDocument: vi.fn(),
    openInNewWindow: vi.fn(),
    ...rest,
    host: {
      readDocument: vi.fn(),
      writeDocument: vi.fn(),
      watchDocument: vi.fn(() => ({ dispose: vi.fn() })),
      resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })),
      ...hostOverrides,
    },
  };
}

describe("createDocumentStore: loadDocument", () => {
  it("loads a document and resolves its workspace config", async () => {
    const doc: LoadedDocument = { uri: "/repo/note.md", text: "hello", revision: "rev-1" };
    const deps = makeDeps({
      host: {
        readDocument: vi.fn(async () => doc),
        resolveWorkspaceConfig: vi.fn(async () => ({ theme: "ember", componentRegistry: registry, frontmatterFields: {} })),
      } as Partial<DocumentStoreDeps["host"]> as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);

    await store.getState().loadDocument("/repo/note.md");

    const state = store.getState();
    expect(state.uri).toBe("/repo/note.md");
    expect(state.text).toBe("hello");
    expect(state.savedText).toBe("hello");
    expect(state.diskText).toBe("hello");
    expect(state.revision).toBe("rev-1");
    expect(state.conflict).toBeNull();
    expect(state.repoThemeFamily).toBe("ember");
    expect(state.componentRegistry).toBe(registry);
  });
});

describe("createDocumentStore: handleOpen", () => {
  it("loads in place when the current window is blank and untouched", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "r1" };
    const deps = makeDeps({
      pickFileToOpen: vi.fn(async () => "/repo/a.md"),
      host: { readDocument: vi.fn(async () => doc), resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);

    await store.getState().handleOpen();

    expect(store.getState().uri).toBe("/repo/a.md");
    expect(deps.openInNewWindow).not.toHaveBeenCalled();
  });

  it("opens in a new window when a document is already loaded", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "r1" };
    const deps = makeDeps({
      pickFileToOpen: vi.fn(async () => "/repo/b.md"),
      host: { readDocument: vi.fn(async () => doc), resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    await store.getState().handleOpen();

    expect(deps.openInNewWindow).toHaveBeenCalledWith("/repo/b.md");
    expect(store.getState().uri).toBe("/repo/a.md"); // unchanged
  });

  it("opens in a new window when the current buffer is dirty even with no uri", async () => {
    const deps = makeDeps({ pickFileToOpen: vi.fn(async () => "/repo/b.md") });
    const store = createDocumentStore(deps);
    store.getState().setText("unsaved work");

    await store.getState().handleOpen();

    expect(deps.openInNewWindow).toHaveBeenCalledWith("/repo/b.md");
  });

  it("does nothing when the picker is cancelled", async () => {
    const deps = makeDeps({ pickFileToOpen: vi.fn(async () => undefined) });
    const store = createDocumentStore(deps);

    await store.getState().handleOpen();

    expect(deps.openInNewWindow).not.toHaveBeenCalled();
    expect(deps.host.readDocument).not.toHaveBeenCalled();
  });
});

describe("createDocumentStore: handleSave", () => {
  it("prompts Save As when there's no uri yet, then writes", async () => {
    const deps = makeDeps({
      pickFileToSaveAs: vi.fn(async () => "/repo/new.md"),
      host: { writeDocument: vi.fn(async () => ({ ok: true, revision: "rev-2" }) as WriteResult) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    store.getState().setText("# New");

    await store.getState().handleSave();

    expect(deps.pickFileToSaveAs).toHaveBeenCalledWith("Untitled.md");
    expect(deps.host.writeDocument).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "/repo/new.md", reason: "save" })
    );
    expect(store.getState().uri).toBe("/repo/new.md");
    expect(store.getState().savedText).toBe("# New");
    expect(store.getState().revision).toBe("rev-2");
  });

  it("does nothing when Save As is cancelled", async () => {
    const deps = makeDeps({ pickFileToSaveAs: vi.fn(async () => undefined) });
    const store = createDocumentStore(deps);

    await store.getState().handleSave();

    expect(deps.host.writeDocument).not.toHaveBeenCalled();
  });

  it("reconciles against diskText and updates state on success", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "# Hello\n\n- one\n- two\n", revision: "rev-1" };
    const write = vi.fn(async (_request: { text: string }) => ({ ok: true, revision: "rev-2" }) as WriteResult);
    const deps = makeDeps({
      host: { readDocument: vi.fn(async () => doc), writeDocument: write, resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");
    store.getState().setText("# Hello!\n\n* one\n* two\n"); // simulate the rich editor normalizing markers

    await store.getState().handleSave();

    const request = write.mock.calls[0][0];
    expect(request.text).toContain("- one\n- two"); // untouched list keeps its original bullets
    expect(store.getState().revision).toBe("rev-2");
    expect(store.getState().saveError).toBeUndefined();
  });

  it("surfaces a conflict without writing further, on a stale baseRevision", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "rev-1" };
    const current: LoadedDocument = { uri: "/repo/a.md", text: "someone else's edit", revision: "rev-9" };
    const deps = makeDeps({
      host: {
        readDocument: vi.fn(async () => doc),
        writeDocument: vi.fn(async () => ({ ok: false, reason: "conflict", current }) as WriteResult),
        resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })),
      } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");
    store.getState().setText("my edit");

    await store.getState().handleSave();

    expect(store.getState().conflict).toEqual({ uri: "/repo/a.md", revision: "rev-9", text: "someone else's edit" });
    expect(store.getState().savedText).not.toBe("my edit");
  });

  it("sets a saveError on an io/permission failure", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "rev-1" };
    const deps = makeDeps({
      host: {
        readDocument: vi.fn(async () => doc),
        writeDocument: vi.fn(async () => ({ ok: false, reason: "permission" }) as WriteResult),
        resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })),
      } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    await store.getState().handleSave();

    expect(store.getState().saveError).toMatch(/permission/i);
  });
});

describe("createDocumentStore: handleRename", () => {
  it("just records the pending filename when there's no uri yet", async () => {
    const deps = makeDeps();
    const store = createDocumentStore(deps);

    await store.getState().handleRename("draft.md");

    expect(store.getState().pendingFilename).toBe("draft.md");
    expect(deps.renameDocument).not.toHaveBeenCalled();
  });

  it("renames an existing document", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "rev-1" };
    const deps = makeDeps({
      renameDocument: vi.fn(async () => "/repo/b.md"),
      host: { readDocument: vi.fn(async () => doc), resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    await store.getState().handleRename("b.md");

    expect(store.getState().uri).toBe("/repo/b.md");
    expect(store.getState().renameError).toBeUndefined();
  });

  it("sets a renameError on failure", async () => {
    const doc: LoadedDocument = { uri: "/repo/a.md", text: "a", revision: "rev-1" };
    const deps = makeDeps({
      renameDocument: vi.fn(async () => {
        throw new Error("already exists");
      }),
      host: { readDocument: vi.fn(async () => doc), resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    await store.getState().handleRename("b.md");

    expect(store.getState().renameError).toBe("already exists");
  });
});

describe("createDocumentStore: conflict resolution", () => {
  it("handleReloadConflict adopts the disk version and clears the conflict", () => {
    const deps = makeDeps();
    const store = createDocumentStore(deps);
    store.getState().setText("my edits");
    const event: ExternalChange = { uri: "/repo/a.md", revision: "rev-9", text: "disk version" };

    store.getState().handleReloadConflict(event);

    const state = store.getState();
    expect(state.text).toBe("disk version");
    expect(state.savedText).toBe("disk version");
    expect(state.diskText).toBe("disk version");
    expect(state.revision).toBe("rev-9");
    expect(state.conflict).toBeNull();
  });

  it("handleOverwriteConflict force-writes using the conflict's revision as the new baseline", async () => {
    const write = vi.fn(async () => ({ ok: true, revision: "rev-10" }) as WriteResult);
    const deps = makeDeps({ host: { writeDocument: write } as unknown as DocumentStoreDeps["host"] });
    const store = createDocumentStore(deps);
    store.getState().setText("my local edit");
    const event: ExternalChange = { uri: "/repo/a.md", revision: "rev-9", text: "disk version" };

    await store.getState().handleOverwriteConflict(event);

    expect(write).toHaveBeenCalledWith(expect.objectContaining({ uri: "/repo/a.md", baseRevision: "rev-9" }));
    expect(store.getState().conflict).toBeNull();
    expect(store.getState().revision).toBe("rev-10");
  });

  it("handleOverwriteConflict re-surfaces a newer conflict rather than failing silently", async () => {
    const newer = { uri: "/repo/a.md", text: "even newer", revision: "rev-11" };
    const deps = makeDeps({
      host: { writeDocument: vi.fn(async () => ({ ok: false, reason: "conflict", current: newer }) as WriteResult) } as unknown as DocumentStoreDeps["host"],
    });
    const store = createDocumentStore(deps);
    store.getState().setText("my local edit");

    await store.getState().handleOverwriteConflict({ uri: "/repo/a.md", revision: "rev-9", text: "disk version" });

    expect(store.getState().conflict).toEqual({ uri: "/repo/a.md", revision: "rev-11", text: "even newer" });
  });
});

describe("createDocumentStore: watch subscription", () => {
  let watchCallback: ((event: ExternalChange) => void) | undefined;
  let disposeWatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchCallback = undefined;
    disposeWatch = vi.fn();
  });

  function depsWithWatch(): DocumentStoreDeps {
    return makeDeps({
      host: {
        readDocument: vi.fn(async (uri: string) => ({ uri, text: "loaded", revision: "rev-1" }) as LoadedDocument),
        resolveWorkspaceConfig: vi.fn(async () => ({ theme: undefined, componentRegistry: registry, frontmatterFields: {} })),
        watchDocument: vi.fn((_uri: string, cb: (event: ExternalChange) => void) => {
          watchCallback = cb;
          return { dispose: disposeWatch };
        }),
      } as unknown as DocumentStoreDeps["host"],
    });
  }

  it("auto-adopts an external change when the document is clean", async () => {
    const deps = depsWithWatch();
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    watchCallback?.({ uri: "/repo/a.md", revision: "rev-2", text: "changed elsewhere" });

    const state = store.getState();
    expect(state.text).toBe("changed elsewhere");
    expect(state.savedText).toBe("changed elsewhere");
    expect(state.conflict).toBeNull();
  });

  it("surfaces a conflict instead of auto-adopting when local edits are pending", async () => {
    const deps = depsWithWatch();
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");
    store.getState().setText("my unsaved edit");

    watchCallback?.({ uri: "/repo/a.md", revision: "rev-2", text: "changed elsewhere" });

    const state = store.getState();
    expect(state.text).toBe("my unsaved edit"); // untouched
    expect(state.conflict).toEqual({ uri: "/repo/a.md", revision: "rev-2", text: "changed elsewhere" });
  });

  it("disposes the previous watch subscription when the uri changes", async () => {
    const deps = depsWithWatch();
    const store = createDocumentStore(deps);
    await store.getState().loadDocument("/repo/a.md");

    await store.getState().loadDocument("/repo/b.md");

    expect(disposeWatch).toHaveBeenCalled();
  });
});
