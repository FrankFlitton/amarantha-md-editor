import { useEffect, useState } from "react";
import type { FontSlot } from "@amarantha/core";

export interface FontPromptRequest {
  slot: FontSlot;
  kind: "fontsource" | "system";
  initialValue: string;
}

export interface FontPromptModalProps {
  request: FontPromptRequest | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/**
 * The one piece of HTML UI in an otherwise fully native-menu-driven app:
 * native menu items can't hold a text field, so the two free-text font
 * flows (a custom Fontsource id, a system font name) open this instead.
 */
export function FontPromptModal({ request, onSubmit, onCancel }: FontPromptModalProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(request?.initialValue ?? "");
  }, [request]);

  useEffect(() => {
    if (!request) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request, onCancel]);

  if (!request) return null;

  const label = request.kind === "fontsource" ? "Fontsource font id" : "System font family";
  const placeholder = request.kind === "fontsource" ? "e.g. jetbrains-mono" : "e.g. Helvetica Neue";

  return (
    <div className="font-prompt-backdrop" data-testid="font-prompt-backdrop" onClick={onCancel}>
      <form
        className="font-prompt"
        data-testid="font-prompt-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <label htmlFor="font-prompt-input">{label}</label>
        <input
          id="font-prompt-input"
          data-testid="font-prompt-input"
          autoFocus
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="font-prompt-actions">
          <button type="button" data-testid="font-prompt-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" data-testid="font-prompt-submit">
            Use
          </button>
        </div>
      </form>
    </div>
  );
}
