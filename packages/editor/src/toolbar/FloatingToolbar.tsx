import React from 'react'
import { createPortal } from 'react-dom'
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
 * Tracks the browser selection rect while it lives inside a Lexical editor, live
 * during drag (native `selectionchange` fires continuously as the user drags),
 * null once the selection collapses or leaves the editor.
 */
function useSelectionRect() {
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    const updateRect = () => {
      const selection = window.getSelection()
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
 * the selection is collapsed/empty. Portaled to `document.body` so `position: fixed`
 * coordinates aren't affected by any scrolling/positioned ancestor of the editor.
 */
export const FloatingToolbar: React.FC<{ className: string; readOnly: boolean; children: React.ReactNode }> = ({
  className,
  readOnly,
  children
}) => {
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
    document.body
  )
}
