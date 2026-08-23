import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A thin wiring smoke test — the document/preferences stores' own business
// logic is already covered by store.test.ts (packages/desktop) and
// documentStore.test.ts (packages/editor); this only catches a wrong
// selector/prop passed to the wrong child component, which those unit tests
// can't see. Every Tauri module App.tsx touches (directly, or transitively
// via desktopHost/nativeMenu/windowManager) is stubbed to a no-op/immediately-
// resolving fake, matching this repo's established per-module vi.mock style
// (see lib/desktopHost.test.ts).

const windowMocks = vi.hoisted(() => ({
  getCurrentWindow: vi.fn(() => ({ setTitle: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock("@tauri-apps/api/window", () => windowMocks);

const fsMocks = vi.hoisted(() => ({
  exists: vi.fn().mockResolvedValue(false),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  rename: vi.fn(),
  watch: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("@tauri-apps/plugin-fs", () => fsMocks);

const pathMocks = vi.hoisted(() => ({
  dirname: vi.fn(async (p: string) => p.slice(0, p.lastIndexOf("/"))),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/path", () => pathMocks);

const dialogMocks = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => dialogMocks);

vi.mock("@tauri-apps/api/webviewWindow", () => ({ WebviewWindow: vi.fn() }));

const menuItemMocks = vi.hoisted(() => {
  function makeFactory() {
    return { new: vi.fn(async (opts: Record<string, unknown> = {}) => ({ ...opts, setChecked: vi.fn().mockResolvedValue(undefined) })) };
  }
  return {
    CheckMenuItem: makeFactory(),
    MenuItem: makeFactory(),
    PredefinedMenuItem: makeFactory(),
    Submenu: makeFactory(),
    Menu: { new: vi.fn(async (opts: Record<string, unknown> = {}) => ({ ...opts, setAsAppMenu: vi.fn().mockResolvedValue(undefined) })) },
  };
});
vi.mock("@tauri-apps/api/menu", () => menuItemMocks);

vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`) }));

import App from "./App";

describe("App wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsMocks.exists.mockResolvedValue(false);
    fsMocks.watch.mockResolvedValue(() => {});
    // jsdom doesn't implement matchMedia; useSystemPrefersDark/the "system"
    // theme-mode branch just need a well-formed MediaQueryList-shaped stub.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("renders the document header and editor surface without crashing", async () => {
    await act(async () => {
      render(<App />);
    });

    // getByTestId itself throws if the element isn't found — that's the assertion.
    screen.getByTestId("doc-header");
    screen.getByTestId("amarantha-rich-editor");
  });

  it("shows the untitled placeholder name and no dirty indicator before any edit", async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId("doc-header-name").textContent).toBe("Untitled.md");
    expect(screen.queryByTestId("doc-header-dirty-dot")).toBeNull();
  });

  it("installs the native menu on mount", async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(menuItemMocks.Menu.new).toHaveBeenCalled();
    });
  });
});
