import { beforeEach, describe, expect, it, vi } from "vitest";

const vscodeMocks = vi.hoisted(() => ({
  commands: { executeCommand: vi.fn() },
  window: { showQuickPick: vi.fn(), showInputBox: vi.fn() },
  QuickPickItemKind: { Separator: -1 },
}));
vi.mock("vscode", () => vscodeMocks);

import { registerPanel, setActivePanel, type AmaranthaWebviewState } from "./panelRegistry";
import { runTypographyQuickPick } from "./typographyQuickPick";

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

function activatePanel(state: AmaranthaWebviewState) {
  const panel = {};
  const post = vi.fn();
  registerPanel(panel as never, { post, state });
  setActivePanel(panel as never, true);
  return post;
}

describe("runTypographyQuickPick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when there is no active panel", async () => {
    setActivePanel({} as never, false); // ensure no panel is left active from a prior test
    await runTypographyQuickPick();
    expect(vscodeMocks.window.showQuickPick).not.toHaveBeenCalled();
  });

  it("shows current size/font values as descriptions in the top-level list", async () => {
    activatePanel(makeState({ proseSize: "lg", sansFont: { kind: "fontsource", fontsourceId: "inter" } }));
    vscodeMocks.window.showQuickPick.mockResolvedValueOnce(undefined); // Escape immediately

    await runTypographyQuickPick();

    const items = vscodeMocks.window.showQuickPick.mock.calls[0][0];
    expect(items.find((i: { action: string }) => i.action === "size").description).toBe("Large");
    expect(items.find((i: { action: string }) => i.action === "sans").description).toBe("Inter");
  });

  it("applies a chosen text size and then returns to the top-level list", async () => {
    const post = activatePanel(makeState());
    vscodeMocks.window.showQuickPick
      .mockResolvedValueOnce({ action: "size" })
      .mockResolvedValueOnce({ label: "Large", size: "lg" })
      .mockResolvedValueOnce(undefined); // exit on the second pass through the top level

    await runTypographyQuickPick();

    expect(post).toHaveBeenCalledWith({ type: "applyProseSize", size: "lg" });
    expect(vscodeMocks.window.showQuickPick).toHaveBeenCalledTimes(3);
  });

  it("applies a curated font choice for the right slot", async () => {
    const post = activatePanel(makeState());
    vscodeMocks.window.showQuickPick
      .mockResolvedValueOnce({ action: "mono" })
      .mockResolvedValueOnce({ label: "JetBrains Mono", kind2: "curated", fontId: "jetbrains-mono" })
      .mockResolvedValueOnce(undefined);

    await runTypographyQuickPick();

    expect(post).toHaveBeenCalledWith({
      type: "applyFont",
      slot: "mono",
      preference: { kind: "fontsource", fontsourceId: "jetbrains-mono" },
    });
  });

  it("prompts for and applies a custom Fontsource id", async () => {
    const post = activatePanel(makeState());
    vscodeMocks.window.showQuickPick
      .mockResolvedValueOnce({ action: "heading" })
      .mockResolvedValueOnce({ label: "Custom Fontsource ID…", kind2: "custom" })
      .mockResolvedValueOnce(undefined);
    vscodeMocks.window.showInputBox.mockResolvedValueOnce("cormorant");

    await runTypographyQuickPick();

    expect(vscodeMocks.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({
      type: "applyFont",
      slot: "heading",
      preference: { kind: "fontsource", fontsourceId: "cormorant" },
    });
  });

  it("returns to the top-level list on Escape from a sub-pick, without posting anything", async () => {
    const post = activatePanel(makeState());
    vscodeMocks.window.showQuickPick
      .mockResolvedValueOnce({ action: "sans" })
      .mockResolvedValueOnce(undefined) // Escape out of the font sub-pick
      .mockResolvedValueOnce(undefined); // Escape out of the top-level list on the next pass

    await runTypographyQuickPick();

    expect(post).not.toHaveBeenCalled();
    expect(vscodeMocks.window.showQuickPick).toHaveBeenCalledTimes(3);
  });
});
