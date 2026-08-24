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
      onDidChangeTextDocument: vi.fn(),
    },
    window: { registerCustomEditorProvider: vi.fn() },
  };
});
vi.mock("vscode", () => vscodeMocks);
vi.mock("./workspaceConfig", () => ({
  resolveWorkspaceConfig: vi.fn(async () => ({ componentDefinitions: [], frontmatterFields: {} })),
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

function makeWebviewPanel(webview: ReturnType<typeof makeWebview>) {
  return {
    webview,
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  };
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
});
