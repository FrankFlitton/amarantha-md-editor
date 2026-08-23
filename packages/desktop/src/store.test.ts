import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FONT_PREFERENCE } from "@amarantha/core";
import { readPreference } from "./lib/preferences";
import { fontForSlot, useAppStore } from "./store";

const INITIAL_STATE = useAppStore.getState();

describe("useAppStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState(INITIAL_STATE, true);
  });

  it("persists modePreference to the same localStorage key usePersistentState used", () => {
    useAppStore.getState().setModePreference("dark");
    expect(useAppStore.getState().modePreference).toBe("dark");
    expect(JSON.parse(localStorage.getItem("amarantha:mode")!)).toBe("dark");
  });

  it("persists familyPreference", () => {
    useAppStore.getState().setFamilyPreference("matrix");
    expect(JSON.parse(localStorage.getItem("amarantha:family")!)).toBe("matrix");
  });

  it("persists sizePreference", () => {
    useAppStore.getState().setSizePreference("lg");
    expect(JSON.parse(localStorage.getItem("amarantha:size")!)).toBe("lg");
  });

  it("routes setFont to the right slot and persists under the right key", () => {
    useAppStore.getState().setFont("heading", { kind: "fontsource", fontsourceId: "libre-baskerville" });
    expect(useAppStore.getState().headingFont).toEqual({ kind: "fontsource", fontsourceId: "libre-baskerville" });
    expect(useAppStore.getState().sansFont).toEqual(DEFAULT_FONT_PREFERENCE); // untouched
    expect(JSON.parse(localStorage.getItem("amarantha:font-heading")!)).toEqual({
      kind: "fontsource",
      fontsourceId: "libre-baskerville",
    });
  });

  it("fontForSlot selector reads the current preference for a slot", () => {
    useAppStore.getState().setFont("mono", { kind: "system", systemFamily: "Menlo" });
    expect(fontForSlot(useAppStore.getState(), "mono")).toEqual({ kind: "system", systemFamily: "Menlo" });
  });

  it("reads an existing localStorage value the same way store creation does", () => {
    // useAppStore itself is a module-level singleton already created before
    // this test runs, so this exercises readPreference directly — the exact
    // function the store calls at creation time — rather than re-importing
    // the module to force a fresh singleton.
    localStorage.setItem("amarantha:size", JSON.stringify("xl"));
    expect(readPreference("amarantha:size", "base")).toBe("xl");
  });

  it("setMode/requestFontPrompt/closeFontPrompt manage transient UI state, not persisted", () => {
    useAppStore.getState().setMode("source");
    expect(useAppStore.getState().mode).toBe("source");

    useAppStore.getState().requestFontPrompt("sans", "fontsource", "jetbrains-mono");
    expect(useAppStore.getState().fontPromptRequest).toEqual({
      slot: "sans",
      kind: "fontsource",
      initialValue: "jetbrains-mono",
    });

    useAppStore.getState().closeFontPrompt();
    expect(useAppStore.getState().fontPromptRequest).toBeNull();
  });
});
