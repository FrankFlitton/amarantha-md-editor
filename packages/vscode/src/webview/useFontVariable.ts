import { useEffect, useState } from "react";
import type { FontPreference, FontSlot } from "@amarantha/core";
import { resolveFontFamily } from "./fontClient";

/** Resolves `preference` (routing a fontsource id through the extension host
 *  to fetch+cache it) and keeps `cssVar` on the document root in sync —
 *  webview counterpart of packages/desktop/src/lib/useFontVariable.ts. */
export function useFontVariable(preference: FontPreference, slot: FontSlot, cssVar: string): string | undefined {
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void resolveFontFamily(preference, slot)
      .then((family) => {
        if (cancelled) return;
        setError(undefined);
        document.documentElement.style.setProperty(cssVar, family);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load font");
      });
    return () => {
      cancelled = true;
    };
  }, [preference, slot, cssVar]);

  return error;
}
