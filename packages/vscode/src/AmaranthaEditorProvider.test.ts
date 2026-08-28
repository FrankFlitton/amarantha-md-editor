import { beforeEach, describe, expect, it, vi } from "vitest";

// A hand-written fake of the parts of the `vscode` module this provider
// touches — the same technique packages/desktop/src/lib/desktopHost.test.ts
// uses for Tauri modules, since the real `vscode` module only exists inside
// the VS Code extension host runtime.
const vscodeMocks = vi.hoisted(() => {
  class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
  }
  class Range {
    constructor(
      public start: Position,
      public end: Position
    ) {}
  }
  class WorkspaceEdit {
    edits: { uri: unknown; range: Range; text: string }[] = [];
    replace(uri: unknown, range: Range, text: string) {
      this.edits.push({ uri, range, text });
    }
  }
  class Uri {
    private constructor(
      public fsPath: string,
      public scheme = "file"
    ) {}
    static file(fsPath: string) {
      return new Uri(fsPath);
    }
    static joinPath(base: Uri, ...parts: string[]) {
      return new Uri([base.fsPath, ...parts].join("/"));
    }
    toString() {
      return `${this.scheme}://${this.fsPath}`;
    }
  }
  return {
    Uri,
    Range,
    Position,
    WorkspaceEdit,
    workspace: {
      applyEdit: vi.fn(async (_edit: WorkspaceEdit) => true),
      onDidChangeTextDocument: vi.fn((_handler: (event: unknown) => void) => ({ dispose: vi.fn() })),
    },
    window: { registerCustomEditorProvider: vi.fn() },
    commands: { executeCommand: vi.fn() },
  };
});
vi.mock("vscode", () => vscodeMocks);
vi.mock("./workspaceConfig", () => ({
  resolveWorkspaceConfig: vi.fn(async () => ({ componentDefinitions: [], frontmatterFields: {} })),
}));
// getHtmlForWebview reads the real Vite build manifest (dist/webview/.vite/manifest.json)
// to find actual output filenames — this unit test isn't running against a
// real build, so stub just enough of a manifest for it to resolve.
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => JSON.stringify({ "src/webview/main.tsx": { file: "assets/main.js", css: ["assets/main.css"] } })),
}));

import { AmaranthaEditorProvider } from "./AmaranthaEditorProvider";
import type { HostMessage, WebviewMessage } from "./protocol";

function makeDocument(initialText: string) {
  let text = initialText;
  return {
    uri: vscodeMocks.Uri.file("/repo/note.md"),
    getText: () => text,
    positionAt: (offset: number) => new vscodeMocks.Position(0, offset),
    setText(next: string) {
      text = next;
    },
  };
}

function makeWebview() {
  let onMessageHandler: ((message: WebviewMessage) => void | Promise<void>) | undefined;
  return {
    options: undefined as unknown,
    html: "",
    cspSource: "vscode-resource:",
    postMessage: vi.fn(async (_message: HostMessage) => true),
    asWebviewUri: (uri: { fsPath: string }) => ({ toString: () => `vscode-webview://${uri.fsPath}` }),
    onDidReceiveMessage(handler: (message: WebviewMessage) => void | Promise<void>) {
      onMessageHandler = handler;
      return { dispose: vi.fn() };
    },
    async fire(message: WebviewMessage) {
      await onMessageHandler?.(message);
    },
  };
}

function makeWebviewPanel(webview: ReturnType<typeof makeWebview>, active = true) {
  let viewStateHandler: ((event: { webviewPanel: { active: boolean } }) => void) | undefined;
  let disposeHandler: (() => void) | undefined;
  const panel = {
    webview,
    active,
    onDidDispose(handler: () => void) {
      disposeHandler = handler;
      return { dispose: vi.fn() };
    },
    onDidChangeViewState(handler: (event: { webviewPanel: { active: boolean } }) => void) {
      viewStateHandler = handler;
      return { dispose: vi.fn() };
    },
    setActive(next: boolean) {
      panel.active = next;
      viewStateHandler?.({ webviewPanel: { active: next } });
    },
    dispose() {
      disposeHandler?.();
    },
  };
  return panel;
}

function fakeContext() {
  return {
    extensionUri: vscodeMocks.Uri.file("/ext"),
    globalStorageUri: vscodeMocks.Uri.file("/storage"),
  };
}

describe("AmaranthaEditorProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends init with the document text once the webview reports ready", async () => {
    const provider = new AmaranthaEditorProvider(fakeContext() as never);
    const document = makeDocument("original text");
    const webview = makeWebview();
    const panel = makeWebviewPanel(webview);

    await provider.resolveCustomTextEditor(document as never, panel as never, {} as never);
    await webview.fire({ type: "ready" });

    expect(webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "init", uri: document.uri.toString(), text: "original text" })
    );
  });

  it("applies an edit via WorkspaceEdit and suppresses the self-write echo, but not a genuinely external change", async () => {
    const provider = new AmaranthaEditorProvider(fakeContext() as never);
    const document = makeDocument("original text");
    const webview = makeWebview();
    const panel = makeWebviewPanel(webview);

    await provider.resolveCustomTextEditor(document as never, panel as never, {} as never);
    const changeCallback = vscodeMocks.workspace.onDidChangeTextDocument.mock.calls[0][0] as (event: {
      document: ReturnType<typeof makeDocument>;
    }) => void;

    await webview.fire({ type: "edit", text: "original text edited" });

    expect(vscodeMocks.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const appliedEdit = vscodeMocks.workspace.applyEdit.mock.calls[0][0];
    expect(appliedEdit.edits[0].text).toBe("original text edited");

    // Simulate VS Code actually applying the edit, then firing the resulting
    // onDidChangeTextDocument — the provider must recognize this as its own
    // write and not treat it as external.
    document.setText("original text edited");
    webview.postMessage.mockClear();
    changeCallback({ document });
    expect(webview.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: "externalUpdate" }));

    // A genuinely external change (undo, another panel, disk/git) must surface.
    document.setText("changed by someone else");
    changeCallback({ document });
    expect(webview.postMessage).toHaveBeenCalledWith({ type: "externalUpdate", text: "changed by someone else" });
  });

  it("syncs amarantha.mode/amarantha.frontmatterHidden context keys when the active panel reports state", async () => {
    const provider = new AmaranthaEditorProvider(fakeContext() as never);
    const document = makeDocument("original text");
    const webview = makeWebview();
    const panel = makeWebviewPanel(webview, true);

    await provider.resolveCustomTextEditor(document as never, panel as never, {} as never);
    vscodeMocks.commands.executeCommand.mockClear();

    await webview.fire({
      type: "stateChanged",
      mode: "source",
      frontmatterHidden: true,
      proseSize: "base",
      sansFont: { kind: "bundled" },
      headingFont: { kind: "bundled" },
      monoFont: { kind: "bundled" },
    });

    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", "source");
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.frontmatterHidden", true);
  });

  it("resyncs context keys to the newly-focused panel's own state on a tab switch", async () => {
    const providerA = new AmaranthaEditorProvider(fakeContext() as never);
    const documentA = makeDocument("doc a");
    const webviewA = makeWebview();
    const panelA = makeWebviewPanel(webviewA, true);
    await providerA.resolveCustomTextEditor(documentA as never, panelA as never, {} as never);
    await webviewA.fire({
      type: "stateChanged",
      mode: "source",
      frontmatterHidden: false,
      proseSize: "base",
      sansFont: { kind: "bundled" },
      headingFont: { kind: "bundled" },
      monoFont: { kind: "bundled" },
    });

    const providerB = new AmaranthaEditorProvider(fakeContext() as never);
    const documentB = makeDocument("doc b");
    const webviewB = makeWebview();
    const panelB = makeWebviewPanel(webviewB, true); // opening panel B activates it, defocusing A
    panelA.setActive(false);
    await providerB.resolveCustomTextEditor(documentB as never, panelB as never, {} as never);
    await webviewB.fire({
      type: "stateChanged",
      mode: "rich",
      frontmatterHidden: true,
      proseSize: "base",
      sansFont: { kind: "bundled" },
      headingFont: { kind: "bundled" },
      monoFont: { kind: "bundled" },
    });

    vscodeMocks.commands.executeCommand.mockClear();
    panelB.setActive(false);
    panelA.setActive(true); // switch focus back to panel A

    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", "source");
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.frontmatterHidden", false);
  });

  it("clears context keys when the active panel is disposed", async () => {
    const provider = new AmaranthaEditorProvider(fakeContext() as never);
    const document = makeDocument("original text");
    const webview = makeWebview();
    const panel = makeWebviewPanel(webview, true);

    await provider.resolveCustomTextEditor(document as never, panel as never, {} as never);
    vscodeMocks.commands.executeCommand.mockClear();

    panel.dispose();

    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", undefined);
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.frontmatterHidden", undefined);
  });
});
