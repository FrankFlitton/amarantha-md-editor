import { beforeEach, describe, expect, it, vi } from "vitest";

const vscodeMocks = vi.hoisted(() => ({
  commands: { executeCommand: vi.fn() },
}));
vi.mock("vscode", () => vscodeMocks);

import { registerPanel, unregisterPanel, updatePanelState, setActivePanel, getActivePanel, type AmaranthaWebviewState } from "./panelRegistry";

function makeState(overrides: Partial<AmaranthaWebviewState> = {}): AmaranthaWebviewState {
  return {
    mode: "rich",
    frontmatterHidden: false,
    proseSize: "base",
    sansFont: { kind: "bundled" },
    headingFont: { kind: "bundled" },
    monoFont: { kind: "bundled" },
    ...overrides,
  };
}

// vscode.WebviewPanel instances are opaque to this module — any distinct
// object identity works as a key.
function fakePanel(): object {
  return {};
}

describe("panelRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs context keys to the active panel's state", () => {
    const panel = fakePanel();
    const post = vi.fn();
    registerPanel(panel as never, { post, state: makeState() });

    setActivePanel(panel as never, true);

    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", "rich");
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.frontmatterHidden", false);
    expect(getActivePanel()?.post).toBe(post);
  });

  it("only resyncs context keys for the currently active panel", () => {
    const panel = fakePanel();
    const post = vi.fn();
    registerPanel(panel as never, { post, state: makeState() });
    setActivePanel(panel as never, true);
    vscodeMocks.commands.executeCommand.mockClear();

    updatePanelState(panel as never, makeState({ mode: "source" }));
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", "source");

    const otherPanel = fakePanel();
    registerPanel(otherPanel as never, { post: vi.fn(), state: makeState() });
    vscodeMocks.commands.executeCommand.mockClear();
    // Updating a panel that isn't active must not touch context keys.
    updatePanelState(otherPanel as never, makeState({ mode: "source" }));
    expect(vscodeMocks.commands.executeCommand).not.toHaveBeenCalled();
  });

  it("keeps two panels on the same document independent", () => {
    const panelA = fakePanel();
    const panelB = fakePanel();
    registerPanel(panelA as never, { post: vi.fn(), state: makeState({ mode: "rich" }) });
    registerPanel(panelB as never, { post: vi.fn(), state: makeState({ mode: "source" }) });

    setActivePanel(panelA as never, true);
    expect(getActivePanel()?.state.mode).toBe("rich");

    setActivePanel(panelA as never, false);
    setActivePanel(panelB as never, true);
    expect(getActivePanel()?.state.mode).toBe("source");
  });

  it("clears context keys and the active panel when the active panel is unregistered", () => {
    const panel = fakePanel();
    registerPanel(panel as never, { post: vi.fn(), state: makeState() });
    setActivePanel(panel as never, true);
    vscodeMocks.commands.executeCommand.mockClear();

    unregisterPanel(panel as never);

    expect(getActivePanel()).toBeUndefined();
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.mode", undefined);
    expect(vscodeMocks.commands.executeCommand).toHaveBeenCalledWith("setContext", "amarantha.frontmatterHidden", undefined);
  });
});
