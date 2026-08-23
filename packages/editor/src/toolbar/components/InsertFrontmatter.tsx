import React from 'react'
import { FileBraces } from 'lucide-react'
import { ButtonWithTooltip } from '.././primitives/toolbar'
import { hasAmaranthaFrontmatter$ as hasFrontmatter$, insertAmaranthaFrontmatter$ as insertFrontmatter$ } from '../../frontmatter/plugin'
import styles from '../ui.module.css'
import classNames from 'classnames'
import { useCellValue, usePublisher } from '@mdxeditor/gurx'
import { useTranslation } from '@mdxeditor/editor'

/**
 * A toolbar button that allows the user to insert a {@link https://jekyllrb.com/docs/front-matter/ | front-matter} editor (if one is not already present).
 * For this to work, you need to have the `amaranthaFrontmatterPlugin` plugin enabled.
 * Uses lucide-react (see docs/decisions.md) rather than MDXEditor's own
 * bundled icon set — FileBraces (file + {}) reads as "structured data
 * attached to this file," which is what frontmatter actually is.
 * @group Toolbar Components
 */
export const InsertFrontmatter: React.FC = () => {
  const insertFrontmatter = usePublisher(insertFrontmatter$)
  const hasFrontmatter = useCellValue(hasFrontmatter$)
  const t = useTranslation()

  return (
    <ButtonWithTooltip
      title={hasFrontmatter ? t('toolbar.editFrontmatter', 'Edit frontmatter') : t('toolbar.insertFrontmatter', 'Insert frontmatter')}
      className={classNames({
        [styles.activeToolbarButton]: hasFrontmatter
      })}
      onClick={() => {
        insertFrontmatter()
      }}
    >
      <FileBraces size={16} />
    </ButtonWithTooltip>
  )
}
