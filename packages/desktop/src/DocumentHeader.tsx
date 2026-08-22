import { useEffect, useState } from "react";

export interface DocumentHeaderProps {
  name: string;
  dirty: boolean;
  error?: string;
  onRename: (newName: string) => void;
}

/**
 * The one thing genuine native title-bar editing (à la Typora, which is a
 * native Cocoa app under the hood) can't give us through Tauri's current
 * window API: click-to-rename. `NSWindow.representedURL` alone gets you the
 * proxy icon and path popover, not inline title editing — that's tied to
 * AppKit's NSDocument architecture, well beyond what's reasonable to bolt on
 * here. This is the pragmatic, cross-platform substitute: the document name
 * (real filename, or the pending name for an unsaved buffer) shown right
 * above the content, click it to edit inline.
 */
export function DocumentHeader({ name, dirty, error, onRename }: DocumentHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  }

  return (
    <div className="doc-header" data-testid="doc-header" data-tauri-drag-region>
      {editing ? (
        <input
          data-testid="doc-header-input"
          className="doc-header-input"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraft(name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="doc-header-name"
          data-testid="doc-header-name"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          {name}
          {dirty && <span className="doc-header-dot" data-testid="doc-header-dirty-dot" aria-label="unsaved changes" />}
        </button>
      )}
      {error && (
        <span className="doc-header-error" data-testid="doc-header-error">
          {error}
        </span>
      )}
    </div>
  );
}
