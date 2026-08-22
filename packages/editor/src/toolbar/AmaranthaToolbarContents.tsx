import React from 'react'
import { EditorInFocus, ADMONITION_TYPES } from '@mdxeditor/editor'
import type { DirectiveNode } from '@mdxeditor/editor'
import { ConditionalContents, Separator } from './primitives/toolbar'
import { BlockTypeSelect } from './components/BlockTypeSelect'
import { BoldItalicUnderlineToggles, StrikeThroughSupSubToggles } from './components/BoldItalicUnderlineToggles'
import { ChangeAdmonitionType } from './components/ChangeAdmonitionType'
import { ChangeCodeMirrorLanguage } from './components/ChangeCodeMirrorLanguage'
import { CodeToggle } from './components/CodeToggle'
import { InsertAdmonition } from './components/InsertAdmonition'
import { InsertCodeBlock } from './components/InsertCodeBlock'
import { InsertFrontmatter } from './components/InsertFrontmatter'
import { InsertImage } from './components/InsertImage'
import { InsertTable } from './components/InsertTable'
import { InsertThematicBreak } from './components/InsertThematicBreak'
import { ListsToggle } from './components/ListsToggle'
import { UndoRedo } from './components/UndoRedo'
import { CreateLink } from './components/CreateLink'
import { HighlightToggle } from './components/HighlightToggle'

// Not part of @mdxeditor/editor's public API; derived from the public ADMONITION_TYPES tuple instead.
type AdmonitionKind = (typeof ADMONITION_TYPES)[number]

function whenInAdmonition(editorInFocus: EditorInFocus | null) {
  const node = editorInFocus?.rootNode
  if (node?.getType() !== 'directive') {
    return false
  }

  return (ADMONITION_TYPES as readonly string[]).includes((node as DirectiveNode).getMdastNode().name as AdmonitionKind)
}

/**
 * Every toolbar button this repo vendors, for the floating selection toolbar
 * (see ../AmaranthaEditor.tsx). Adapted from @mdxeditor/editor's KitchenSinkToolbar,
 * minus its DiffSourceToggleWrapper: that toggle only works with `diffSourcePlugin`
 * installed, which AmaranthaEditor deliberately doesn't use (Rich/Source switching is
 * handled at the app level instead) — including it here would add a dead-end button.
 */
export const AmaranthaToolbarContents: React.FC = () => {
  return (
    <ConditionalContents
      options={[
        { when: (editor) => editor?.editorType === 'codeblock', contents: () => <ChangeCodeMirrorLanguage /> },
        {
          fallback: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <HighlightToggle />
              <Separator />
              <StrikeThroughSupSubToggles />
              <Separator />
              <ListsToggle />
              <Separator />

              <ConditionalContents
                options={[{ when: whenInAdmonition, contents: () => <ChangeAdmonitionType /> }, { fallback: () => <BlockTypeSelect /> }]}
              />

              <Separator />

              <CreateLink />
              <InsertImage />

              <Separator />

              <InsertTable />
              <InsertThematicBreak />

              <Separator />
              <InsertCodeBlock />

              <ConditionalContents
                options={[
                  {
                    when: (editorInFocus) => !whenInAdmonition(editorInFocus),
                    contents: () => (
                      <>
                        <Separator />
                        <InsertAdmonition />
                      </>
                    )
                  }
                ]}
              />

              <Separator />
              <InsertFrontmatter />
            </>
          )
        }
      ]}
    />
  )
}
