/**
 * MDXEditor's contentEditable box is only as tall as its content and capped
 * at a centered 720px column (see `.amarantha-prose` in App.css), so
 * `.editor-surface` — which always fills the window — has real dead space
 * above/below/beside it that native contentEditable click handling never
 * sees. This clamps a click to the nearest point inside the contentEditable
 * box and resolves it to a caret position there, so clicking anywhere in
 * that dead space (a short/new document, or the margins beside a line in a
 * longer one) still places the cursor at the nearest reasonable spot instead
 * of doing nothing.
 */
export function placeCursorNearClick(surfaceEl: HTMLElement, clientX: number, clientY: number): boolean {
  const contentEditableEl = surfaceEl.querySelector<HTMLElement>('[contenteditable="true"]');
  if (!contentEditableEl) return false;

  const rect = contentEditableEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const x = Math.min(Math.max(clientX, rect.left), rect.right - 1);
  const y = Math.min(Math.max(clientY, rect.top), rect.bottom - 1);

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  let range: Range | null = null;
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(x, y);
  } else if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }
  if (!range) return false;

  contentEditableEl.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}
