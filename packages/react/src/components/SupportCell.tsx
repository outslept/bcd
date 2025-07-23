import type { BrowserName } from '@mdn/browser-compat-data'
import { useRef } from 'react'
import { createPortal } from 'react-dom'

import { useCompatTable } from '../lib/store'
import { getSupportClassName, hasMore, hasNoteworthyNotes, getCurrentSupport } from '../lib/support-analysis'
import { usePopup } from '../lib/use-popup'
import styles from '../styles/components/SupportCell.module.css'

import { CellText } from './CellText'
import { useFeatureRow } from './FeatureRow'
import { Notes } from './Notes'

function CompatTableSupportCell({
  ref,
  browser,
  children,
  ...props
}: {
  browser: BrowserName
  children?: React.ReactNode
  ref?: React.RefObject<HTMLTableCellElement | null>
}) {
  const { browserInfo } = useCompatTable()
  const { feature } = useFeatureRow()

  const browserStatement = browserInfo[browser]
  const support = feature.compat.support[browser] ?? { version_added: null }
  const supportClassName = getSupportClassName(support, browserStatement)

  const currentSupport = getCurrentSupport(support)
  const hasNotes = (hasMore(support) ||
    (currentSupport && hasNoteworthyNotes(currentSupport)) ??
    (currentSupport?.flags) ??
    (currentSupport?.prefix)) ??
    (currentSupport?.alternative_name)

  const popup = usePopup()

  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const cellClasses = [
    styles['support-cell'],
    styles[`support-cell--${supportClassName}`],
  ]
    .filter(Boolean)
    .join(' ')

  if (children) {
    return (
      <td
        ref={ref}
        className={cellClasses}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        {children}
      </td>
    )
  }

  if (!hasNotes) {
    return (
      <td
        ref={ref}
        className={cellClasses}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        <div className={styles['support-button']}>
          <CellText support={support} browser={browserStatement} />
        </div>
      </td>
    )
  }

  return (
    <>
      <td
        ref={ref}
        className={cellClasses}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        <button
          ref={(element) => {
            buttonRef.current = element
            popup.triggerRef.current = element
          }}
          type="button"
          className={styles['support-button']}
          title="Show support details"
          aria-haspopup="dialog"
          aria-expanded={popup.open}
          aria-label={`${browserStatement.name} support details`}
          onClick={popup.onOpenToggle}
        >
          <CellText support={support} browser={browserStatement} />
        </button>
      </td>

      {popup.open &&
        createPortal(
          <div
            ref={(element) => {
              popupRef.current = element
              popup.contentRef.current = element
            }}
            className={styles.popup}
            role="dialog"
            tabIndex={-1}
            aria-label="Support history"
          >
            <div className={styles['popup-content']}>
              <Notes browser={browserStatement} support={support} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export { CompatTableSupportCell }
