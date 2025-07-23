import type {
  BrowserStatement,
  SupportStatement,
} from '@mdn/browser-compat-data'
import { memo } from 'react'

import { getCurrentSupport, getSupportClassName } from '../lib/support-analysis'
import styles from '../styles/components/CellText.module.css'

import { CellIcons } from './Icon'

const CellText = memo(function CellText({
  support,
  browser,
  timeline = false,
}: {
  support: SupportStatement | undefined
  browser: BrowserStatement
  timeline?: boolean
}) {
  const currentSupport = getCurrentSupport(support)
  const added = currentSupport?.version_added
  const lastVersion = currentSupport?.version_last
  const supportClassName = getSupportClassName(support, browser)

  const browserReleaseDate =
    currentSupport?.version_added &&
    typeof currentSupport.version_added === 'string'
      ? (browser.releases[currentSupport.version_added].release_date ?? null)
      : null

  const versionLabel = (() => {
    if (typeof lastVersion === 'string') {
      const addedLabel =
        typeof added === 'string'
          ? added === 'preview'
            ? (browser.preview_name ?? 'Preview')
            : added.replace(/(\.0)+$/g, '')
          : '?'
      const removedLabel = lastVersion.replace(/(\.0)+$/g, '')
      return `${addedLabel}–${removedLabel}`
    }

    if (typeof added === 'string') {
      return added === 'preview'
        ? (browser.preview_name ?? 'Preview')
        : added.replace(/(\.0)+$/g, '')
    }

    return '?'
  })()

  let status: { isSupported: string; label?: string }
  switch (added) {
    case null:
    case undefined:
      status = { isSupported: 'unknown' }
      break
    case true:
      status = { isSupported: lastVersion ? 'no' : 'yes' }
      break
    case false:
      status = { isSupported: 'no' }
      break
    case 'preview':
      status = { isSupported: 'preview' }
      break
    default:
      status = { isSupported: supportClassName, label: versionLabel }
      break
  }

  let label: string
  let title = ''

  switch (status.isSupported) {
    case 'yes':
      title = 'Full support'
      label = status.label ?? 'Yes'
      break
    case 'partial':
      title = 'Partial support'
      label = status.label ?? 'Partial'
      break
    case 'removed-partial':
      if (timeline) {
        title = 'Partial support'
        label = status.label ?? 'Partial'
      } else {
        title = 'No support'
        label = status.label ?? 'No'
      }
      break
    case 'no':
      title = 'No support'
      label = status.label ?? 'No'
      break
    case 'preview':
      title = 'Preview support'
      label = status.label ?? browser.preview_name ?? 'Preview'
      break
    case 'unknown':
      title = 'Support unknown'
      label = '?'
      break
    default:
      title = 'Support unknown'
      label = '?'
  }

  title = `${browser.name} – ${title}`

  return (
    <div
      className={
        timeline
          ? styles['cell-text-wrapper--timeline']
          : styles['cell-text-wrapper']
      }
    >
      <div className={styles['cell-content']}>
        {timeline && (
          <span className={styles['browser-name']}>{browser.name}</span>
        )}
        <span
          className={styles['version-label']}
          title={
            browserReleaseDate && !timeline
              ? `${browser.name} ${String(added)} – Released ${browserReleaseDate}`
              : title
          }
        >
          {!timeline || added ? label : null}
          {browserReleaseDate && timeline
            ? ` (Released ${browserReleaseDate})`
            : ''}
        </span>
      </div>
      {support && <CellIcons support={support} />}
    </div>
  )
})

export { CellText }
