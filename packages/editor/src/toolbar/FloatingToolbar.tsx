import React from 'react'
import { createPortal } from 'react-dom'
import { useCellValue } from '@mdxeditor/gurx'
import { editorRootElementRef$ } from '@mdxeditor/editor'
import { Root } from './primitives/toolbar'

const MARGIN = 8

// Every Lexical contenteditable root (including this app's own, and any nested
// editor MDXEditor mounts for tables/JSX) carries this attribute. Walking up to
// it — rather than checking containment against a specific MDXEditor ref — is
// the DOM-only way to confirm a selection belongs to a Lexical editor at all;
// `editorRootElementRef$` isn't it despite the name, it's the popup/dialog
// portal container element (see primitives/DialogButton.tsx, select.tsx).
const LEXICAL_EDITOR_ATTR_SELECTOR = '[data-lexical-editor="true"]'

/**
 * `document.getSelection()`/`window.getSelection()` only ever reflect a
 * selection living in the *light* DOM — a selection made inside an open
 * shadow root (the Chrome extension mounts its whole editor in one) reads
 * back empty/collapsed through those, even though it's live: that's what
 * made this toolbar never appear on a normal click-drag selection there,
 * only ever on a double-click, whatever different internal path Chromium
 * routes that through. `ShadowRoot.prototype.getSelection` (non-standard,
 * Chromium-only — fine here, this only ever runs inside a Chrome extension
 * or a plain document with no shadow root at all) returns the selection
 * scoped correctly to that root instead. `document.activeElement`, when
 * focus is inside a shadow tree, resolves to the shadow *host* per spec —
 * its own `.shadowRoot` is exactly the root the live selection is in.
 */
function getActiveSelection(): Selection | null {
  const shadowRoot = document.activeElement?.shadowRoot
  const shadowGetSelection = (shadowRoot as unknown as { getSelection?: () => Selection | null } | undefined)
    ?.getSelection
  return shadowGetSelection ? shadowGetSelection.call(shadowRoot) : document.getSelection()
}

/**
 * Tracks the browser selection rect while it lives inside a Lexical editor, live
 * during drag (native `selectionchange` fires continuously as the user drags),
 * null once the selection collapses or leaves the editor.
 */
function useSelectionRect() {
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    const updateRect = () => {
      const selection = getActiveSelection()
      const anchorNode = selection?.anchorNode ?? null
      const anchorElement = anchorNode ? (anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement) : null
      const insideEditor = !!anchorElement?.closest(LEXICAL_EDITOR_ATTR_SELECTOR)

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !insideEditor) {
        setRect(null)
        return
      }
      setRect(selection.getRangeAt(0).getBoundingClientRect())
    }

    document.addEventListener('selectionchange', updateRect)
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    updateRect()

    return () => {
      document.removeEventListener('selectionchange', updateRect)
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [])

  return rect
}

/**
 * Renders `children` inside the shared toolbar Root, positioned as a floating bubble
 * above (or, if clipped, below) the current text selection — hidden entirely while
 * the selection is collapsed/empty. Portaled to `editorRootElementRef$`'s current
 * element when set (the same portal target `overlayContainer` — see AmaranthaEditor
 * — points at select.tsx/DialogButton.tsx's popups), `document.body` otherwise: a
 * `position: fixed` element's coordinates aren't affected by which one it lands in
 * either way, but a host that isolates its own CSS in a Shadow DOM (the Chrome
 * extension) needs it inside that tree or none of that CSS ever reaches this toolbar.
 */
export const FloatingToolbar: React.FC<{ className: string; readOnly: boolean; children: React.ReactNode }> = ({
  className,
  readOnly,
  children
}) => {
  const editorRootElementRef = useCellValue(editorRootElementRef$)
  const selectionRect = useSelectionRect()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [panelSize, setPanelSize] = React.useState<{ width: number; height: number } | null>(null)

  React.useLayoutEffect(() => {
    if (!selectionRect) {
      setPanelSize(null)
      return
    }
    const measured = panelRef.current?.getBoundingClientRect()
    if (measured) {
      setPanelSize({ width: measured.width, height: measured.height })
    }
  }, [selectionRect, children])

  if (readOnly || !selectionRect || selectionRect.width === 0) {
    return null
  }

  const width = panelSize?.width ?? 0
  const height = panelSize?.height ?? 0

  let top = selectionRect.top - height - MARGIN
  if (top < MARGIN) {
    top = selectionRect.bottom + MARGIN
  }

  let left = selectionRect.left + selectionRect.width / 2 - width / 2
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN))

  return createPortal(
    <div
      ref={panelRef}
      // Keep the browser selection alive when a toolbar button is pressed: a plain
      // mousedown on it would otherwise collapse the selection before the button's
      // click handler runs, which is exactly the built-in behavior we need to override.
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 50,
        visibility: panelSize ? 'visible' : 'hidden'
      }}
    >
      <Root className={className} readOnly={readOnly}>
        {children}
      </Root>
    </div>,
    editorRootElementRef?.current ?? document.body
  )
}
