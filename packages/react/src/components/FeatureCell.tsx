import { type ReactNode, type RefObject } from 'react'

import styles from '../styles/components/FeatureCell.module.css'

import { useFeatureRow } from './FeatureRow'
import { StatusIcons } from './Icon'

function CompatTableFeatureCell({
  ref,
  children,
  ...props
}: {
  children?: ReactNode
  ref?: RefObject<HTMLTableCellElement | null>
}) {
  const { feature } = useFeatureRow()
  const { name, compat, depth } = feature

  if (children) {
    return (
      <th
        ref={ref}
        className={`${styles['feature-cell']} ${styles[`feature-cell--depth-${String(depth)}`]}`}
        scope="row"
        data-depth={depth}
        {...props}
      >
        {children}
      </th>
    )
  }

  const title = compat.description ? (
    <span dangerouslySetInnerHTML={{ __html: compat.description }} />
  ) : (
    <code>{name}</code>
  )

  const titleContent = (
    <>
      {title}
      {compat.status && <StatusIcons status={compat.status} />}
    </>
  )

  const titleNode =
    compat.mdn_url && depth > 0 ? (
      <a href={compat.mdn_url} className={styles['feature-header']}>
        {titleContent}
      </a>
    ) : (
      <div className={styles['feature-header']}>{titleContent}</div>
    )

  return (
    <th
      ref={ref}
      className={`${styles['feature-cell']} ${styles[`feature-cell--depth-${String(depth)}`]}`}
      scope="row"
      data-depth={depth}
      {...props}
    >
      {titleNode}
    </th>
  )
}

export { CompatTableFeatureCell }
