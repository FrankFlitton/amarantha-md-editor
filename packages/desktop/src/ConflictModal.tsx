import { useEffect } from "react";
import type { ExternalChange } from "@amarantha/core";

export interface ConflictModalProps {
  conflict: ExternalChange | null;
  onReload: (conflict: ExternalChange) => void;
  onOverwrite: (conflict: ExternalChange) => void;
  onDismiss: () => void;
}

/**
 * A second deliberate exception to the app's otherwise all-native-menu-driven
 * UI (the first being FontPromptModal): the disk's current content is a
 * decision input no native menu item can hold. Shown whenever the file this
 * document was loaded from changed on disk while local edits were pending —
 * never applied automatically, per the RFC's "never overwrite silently" rule.
 */
export function ConflictModal({ conflict, onReload, onOverwrite, onDismiss }: ConflictModalProps) {
  useEffect(() => {
    if (!conflict) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [conflict, onDismiss]);

  if (!conflict) return null;

  return (
    <div className="conflict-backdrop" data-testid="conflict-backdrop" onClick={onDismiss}>
      <div className="conflict-modal" data-testid="conflict-modal" onClick={(event) => event.stopPropagation()}>
        <p className="conflict-message">
          This file changed on disk since it was opened. Your unsaved changes are still here — choose what to do
          before saving again.
        </p>
        <div className="conflict-actions">
          <button type="button" data-testid="conflict-dismiss" onClick={onDismiss}>
            Keep Editing
          </button>
          <button type="button" data-testid="conflict-reload" onClick={() => onReload(conflict)}>
            Reload from Disk
          </button>
          <button type="button" data-testid="conflict-overwrite" onClick={() => onOverwrite(conflict)}>
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}
