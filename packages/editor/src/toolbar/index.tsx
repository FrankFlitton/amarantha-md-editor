import { realmPlugin } from '@mdxeditor/editor'
import { Cell, useCellValues } from '@mdxeditor/gurx'
import React from 'react'
import { addTopAreaChild$, addBottomAreaChild$, readOnly$ } from '@mdxeditor/editor'
import { Root } from './primitives/toolbar'
import { FloatingToolbar } from './FloatingToolbar'

/**
 * The factory function that returns the contents of the toolbar.
 * @group Toolbar
 */
export const toolbarContents$ = Cell<() => React.ReactNode>(() => null)
export const toolbarClassName$ = Cell<string>('')

const DEFAULT_TOOLBAR_CONTENTS = () => {
  return 'This is an empty toolbar. Pass `{toolbarContents: () => { return <>toolbar components</> }}` to the toolbarPlugin to customize it.'
}

/**
 * Vendored + customized fork of @mdxeditor/editor's toolbar plugin (v4.2.1) — see
 * docs/decisions.md for why. Adds a `'floating'` toolbarPosition (the default here)
 * that shows the toolbar as a selection-triggered bubble instead of an always-visible
 * top/bottom bar, on top of the upstream 'top'/'bottom' behavior kept unchanged.
 * @group Toolbar
 */
export const toolbarPlugin = realmPlugin<{
  /**
   * Contents of the toolbar
   */
  toolbarContents: () => React.ReactNode
  /**
   * The class name to apply to the toolbar element
   */
  toolbarClassName?: string
  /**
   * Controls the position of the toolbar. `'floating'` (default) shows it as a bubble
   * anchored to the current text selection, appearing while the user drags over text
   * and disappearing once the selection collapses. `'top'`/`'bottom'` render it as a
   * normal always-visible bar, matching upstream MDXEditor's toolbarPlugin.
   */
  toolbarPosition?: 'top' | 'bottom' | 'floating'
}>({
  init(realm, params) {
    const position = params?.toolbarPosition ?? 'floating'
    const toolbarPositionSymbol = position === 'bottom' ? addBottomAreaChild$ : addTopAreaChild$
    realm.pubIn({
      [toolbarContents$]: params?.toolbarContents ?? DEFAULT_TOOLBAR_CONTENTS,
      [toolbarClassName$]: params?.toolbarClassName ?? '',
      [toolbarPositionSymbol]: () => {
        const [toolbarContents, readOnly, toolbarClassName] = useCellValues(toolbarContents$, readOnly$, toolbarClassName$)
        if (position === 'floating') {
          return (
            <FloatingToolbar className={toolbarClassName} readOnly={readOnly}>
              {toolbarContents()}
            </FloatingToolbar>
          )
        }
        return (
          <Root className={toolbarClassName} readOnly={readOnly}>
            {toolbarContents()}
          </Root>
        )
      }
    })
  },
  update(realm, params) {
    realm.pub(toolbarContents$, params?.toolbarContents ?? DEFAULT_TOOLBAR_CONTENTS)
    realm.pub(toolbarClassName$, params?.toolbarClassName ?? '')
  }
})
