import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePreference<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage disabled (e.g. private browsing) — preference just won't persist.
  }
}

/** A global, app-wide preference persisted to localStorage — not per-document. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readPreference(key, initial));
  useEffect(() => {
    writePreference(key, state);
  }, [key, state]);
  return [state, setState];
}

/** Live OS light/dark preference, for the "system" mode option. */
export function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return prefersDark;
}
