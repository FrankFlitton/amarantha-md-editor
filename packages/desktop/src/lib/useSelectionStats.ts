import { useEffect, useState } from "react";

export interface SelectionStats {
  characters: number;
  estimatedTokens: number;
}

/**
 * Rough token estimate (~4 characters per token) — the common heuristic for
 * GPT-style tokenizers when an exact tokenizer isn't available. This is an
 * estimate, not an exact count.
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

/**
 * Reads the currently selected text, covering both editing surfaces:
 * `window.getSelection()` reports contentEditable (rich mode) selections,
 * but never a `<textarea>`'s (source mode) — those need their own
 * selectionStart/selectionEnd read directly off the focused element.
 */
function readSelectedText(): string {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = active;
    if (selectionStart == null || selectionEnd == null || selectionStart === selectionEnd) return "";
    return value.slice(selectionStart, selectionEnd);
  }
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return "";
  return selection.toString();
}

/**
 * Tracks the current text selection (rich contentEditable or the
 * source-mode textarea) and reports its character count plus a rough token
 * estimate. Returns null whenever there's no active range selection.
 */
export function useSelectionStats(): SelectionStats | null {
  const [stats, setStats] = useState<SelectionStats | null>(null);

  useEffect(() => {
    function update() {
      const text = readSelectedText();
      setStats(text ? { characters: text.length, estimatedTokens: estimateTokens(text) } : null);
    }
    document.addEventListener("selectionchange", update);
    update();
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  return stats;
}
