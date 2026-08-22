import React from 'react'
import { EditorInFocus, ADMONITION_TYPES } from '@mdxeditor/editor'
import type { DirectiveNode } from '@mdxeditor/editor'
import { ConditionalContents, Separator } from '../primitives/toolbar'
import { BlockTypeSelect } from './BlockTypeSelect'
import { BoldItalicUnderlineToggles, StrikeThroughSupSubToggles } from './BoldItalicUnderlineToggles'
import { ChangeAdmonitionType } from './ChangeAdmonitionType'
import { ChangeCodeMirrorLanguage } from './ChangeCodeMirrorLanguage'
import { CodeToggle } from './CodeToggle'
import { DiffSourceToggleWrapper } from './DiffSourceToggleWrapper'
import { InsertAdmonition } from './InsertAdmonition'
import { InsertCodeBlock } from './InsertCodeBlock'
import { InsertFrontmatter } from './InsertFrontmatter'
import { InsertImage } from './InsertImage'
import { InsertTable } from './InsertTable'
import { InsertThematicBreak } from './InsertThematicBreak'
import { ListsToggle } from './ListsToggle'
import { UndoRedo } from './UndoRedo'
import { CreateLink } from './CreateLink'
import { HighlightToggle } from './HighlightToggle'

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
 * A toolbar component that includes all toolbar components.
 * Notice that some of the buttons will work only if you have the corresponding plugin enabled, so you should use it only for testing purposes.
 * You'll probably want to create your own toolbar component that includes only the buttons that you need.
 * @group Toolbar Components
 */
export const KitchenSinkToolbar: React.FC = () => {
  return (
    <DiffSourceToggleWrapper>
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
    </DiffSourceToggleWrapper>
  )
}
