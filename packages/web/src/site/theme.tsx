import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ThemeFamily, ThemeMode } from "@amarantha/core";
import { themeId } from "@amarantha/theme";

interface SiteThemeValue {
  family: ThemeFamily;
  setFamily: (family: ThemeFamily) => void;
  dark: boolean;
  setDark: Dispatch<SetStateAction<boolean>>;
  currentThemeId: string;
}

const SiteThemeContext = createContext<SiteThemeValue | null>(null);

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<ThemeFamily>("ember");
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const mode: ThemeMode = dark ? "dark" : "light";
  const currentThemeId = useMemo(() => themeId(family, mode), [family, mode]);

  // Mirrored onto <html>, not just a wrapper div, so portaled UI (the
  // floating toolbar, its tooltip) resolves the theme correctly too — see
  // packages/theme/src/mdxeditor-adapter.css and docs/decisions.md Session 5.
  useEffect(() => {
    document.documentElement.dataset.theme = currentThemeId;
  }, [currentThemeId]);

  const value = useMemo(
    () => ({ family, setFamily, dark, setDark, currentThemeId }),
    [family, dark, currentThemeId]
  );

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return ctx;
}
