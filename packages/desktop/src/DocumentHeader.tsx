import { FileBraces } from "lucide-react";
import { InlineEditableText } from "@amarantha/editor";
import { useSelectionStats } from "./lib/useSelectionStats";

export interface DocumentHeaderProps {
  name: string;
  dirty: boolean;
  error?: string;
  onRename: (newName: string) => void;
  /** Whether the current document has a YAML frontmatter block at all. */
  hasFrontmatter?: boolean;
  /** Whether the frontmatter strip is currently hidden in the canvas. */
  frontmatterHidden?: boolean;
  onToggleFrontmatterVisibility?: () => void;
}

/**
 * The one thing genuine native title-bar editing (à la Typora, which is a
 * native Cocoa app under the hood) can't give us through Tauri's current
 * window API: click-to-rename. `NSWindow.representedURL` alone gets you the
 * proxy icon and path popover, not inline title editing — that's tied to
 * AppKit's NSDocument architecture, well beyond what's reasonable to bolt on
 * here. This is the pragmatic, cross-platform substitute: the document name
 * (real filename, or the pending name for an unsaved buffer) shown right
 * above the content, click it to edit inline — using the same
 * InlineEditableText primitive (and its grey-background-only affordance) as
 * the frontmatter fields, for one consistent edit-in-place treatment
 * throughout the app.
 */
export function DocumentHeader({
  name,
  dirty,
  error,
  onRename,
  hasFrontmatter,
  frontmatterHidden,
  onToggleFrontmatterVisibility,
}: DocumentHeaderProps) {
  const selectionStats = useSelectionStats();

  return (
    <div className="doc-header" data-testid="doc-header" data-tauri-drag-region>
      <span className="doc-header-name-group">
        <InlineEditableText
          className="doc-header-name"
          testId="doc-header-name"
          ariaLabel="Document name"
          value={name}
          selectAllOnFocus
          onCommit={(next) => {
            const trimmed = next.trim();
            if (trimmed) onRename(trimmed);
          }}
        />
        {dirty && <span className="doc-header-dot" data-testid="doc-header-dirty-dot" aria-label="unsaved changes" />}
      </span>
      {error && (
        <span className="doc-header-error" data-testid="doc-header-error">
          {error}
        </span>
      )}
      <span className="doc-header-right">
        {selectionStats && (
          <span className="doc-header-selection-stats" data-testid="doc-header-selection-stats">
            {selectionStats.characters} chars · ~{selectionStats.estimatedTokens} tokens
          </span>
        )}
        {hasFrontmatter && (
          <button
            type="button"
            className="doc-header-frontmatter-glyph"
            data-testid="doc-header-frontmatter-toggle"
            aria-label={frontmatterHidden ? "Show properties" : "Hide properties"}
            aria-pressed={!frontmatterHidden}
            onClick={onToggleFrontmatterVisibility}
          >
            <FileBraces size={14} strokeWidth={2} />
          </button>
        )}
      </span>
    </div>
  );
}
