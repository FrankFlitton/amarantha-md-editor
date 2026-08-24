import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./InlineEditableText.css";

export interface InlineEditableTextProps {
  value: string;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  testId?: string;
  autoFocus?: boolean;
  /** Select the whole field on focus (e.g. renaming a file) rather than leaving the caret where clicked (the default — better for editing a word within longer text). */
  selectAllOnFocus?: boolean;
  /** Enter inserts a line break instead of committing/blurring (JSX expression props, anything textarea-shaped) — the caller must also set `white-space: pre-wrap` via `className` or newlines won't visually render. */
  multiline?: boolean;
  /** Fires only when the committed text differs from `value`. */
  onCommit: (next: string) => void;
  /** Always fires on blur, after onCommit (if any) — for a caller that needs to know editing ended regardless of whether anything changed. */
  onBlur?: () => void;
}

/**
 * One click-to-edit text field, rendered as a single persistent
 * `contentEditable` element rather than swapping between a display element
 * and an `<input>` on click: same DOM node, same wrapping/box model,
 * whether it's being read or edited, so there's no visual "tear" when
 * entering/leaving edit mode. The only edit affordance is a grey background
 * on hover/focus (see InlineEditableText.css) — no underline, no outline —
 * used consistently everywhere in the app a piece of text is directly
 * editable in place (frontmatter fields, the document filename).
 *
 * Deliberately uncontrolled: React never re-renders text into this element
 * while it's focused (see the sync effect below), so typing never fights
 * the caret position the way a controlled contentEditable would.
 */
export function InlineEditableText({
  value,
  placeholder,
  title,
  ariaLabel,
  className,
  testId,
  autoFocus,
  selectAllOnFocus,
  multiline,
  onCommit,
  onBlur,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused || !ref.current) return;
    if (ref.current.textContent !== value) ref.current.textContent = value;
  }, [value, focused]);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    ref.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    const next = ref.current?.textContent ?? "";
    if (next !== value) onCommit(next);
    onBlur?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (multiline) {
        // A bare Enter on a contentEditable div normally splits it into
        // separate <div>s per line (browser default paragraph behavior),
        // which .textContent then reads back with no separator between
        // lines at all — silently losing every line break. Inserting a
        // literal "\n" character instead (same execCommand path the paste
        // handler below already uses) keeps this one text node with real
        // newlines in it, which `white-space: pre-wrap` then renders
        // correctly and .textContent reads back correctly too.
        try {
          document.execCommand("insertText", false, "\n");
        } catch {
          // execCommand is unavailable in some test environments; a no-op there.
        }
        return;
      }
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (ref.current) ref.current.textContent = value;
      event.currentTarget.blur();
    }
  }

  return (
    <div
      ref={ref}
      className={`amarantha-inline-editable ${className ?? ""}`}
      data-testid={testId}
      data-placeholder={placeholder}
      title={title}
      role="textbox"
      aria-label={ariaLabel ?? placeholder}
      aria-multiline={multiline}
      contentEditable
      suppressContentEditableWarning
      onFocus={(event) => {
        setFocused(true);
        if (selectAllOnFocus) {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(event.currentTarget);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={handleKeyDown}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        try {
          document.execCommand("insertText", false, text);
        } catch {
          // execCommand is unavailable in some test environments; the paste is a no-op there.
        }
      }}
    />
  );
}
